/**
 * ParserService — Pure function engine for extracting transaction data
 * from raw text (SMS, notifications, OCR output, or pasted messages).
 *
 * Handles Indian and Global currency formats:
 * ₹, Rs, Rs., INR, $, USD, EUR, €
 */

export interface ParsedTransaction {
  amount: number;
  merchant: string | null;
  date: Date | null;
  type: 'expense' | 'income';
  confidence: number; // 0.0 - 1.0
}

// Currency patterns — supports ₹1,234.56 / Rs 1234 / INR 1,234 / $1234.56
const CURRENCY_REGEX =
  /(?:₹|Rs\.?|INR|USD|\$|EUR|€)\s*([0-9]{1,3}(?:,?[0-9]{3})*(?:\.[0-9]{1,2})?)|([0-9]{1,3}(?:,?[0-9]{3})*(?:\.[0-9]{1,2})?)\s*(?:₹|Rs\.?|INR|USD|\$|EUR|€)/gi;

// Debit keywords (expense indicators)
const DEBIT_KEYWORDS = [
  'debited',
  'debit',
  'spent',
  'paid',
  'payment',
  'purchase',
  'withdrawn',
  'withdrawal',
  'charged',
  'transferred to',
  'sent to',
  'bill payment',
  'txn',
];

// Credit keywords (income indicators)
const CREDIT_KEYWORDS = [
  'credited',
  'credit',
  'received',
  'refund',
  'cashback',
  'deposited',
  'transferred from',
  'salary',
  'income',
];

// Merchant extraction patterns
const MERCHANT_PATTERNS = [
  /(?:at|to|from|via|@)\s+([A-Za-z0-9\s&'.,-]+?)(?:\s+(?:on|for|ref|txn|upi|via|\.|$))/i,
  /(?:to|from)\s+([A-Za-z][A-Za-z0-9\s&'.-]{2,30})/i,
  /(?:UPI|upi)[:\-/]([A-Za-z0-9\s&'.@-]+?)(?:\s|$)/i,
];

// Date patterns
const DATE_PATTERNS = [
  /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/,
  /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*,?\s*\d{2,4})/i,
  /(\d{4}[/-]\d{2}[/-]\d{2})/,
];

function extractAmount(text: string): number | null {
  const matches: number[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(CURRENCY_REGEX.source, CURRENCY_REGEX.flags);

  while ((match = regex.exec(text)) !== null) {
    const rawAmount = (match[1] || match[2] || '').replace(/,/g, '');
    const parsed = parseFloat(rawAmount);
    if (!isNaN(parsed) && parsed > 0 && parsed < 10000000) {
      matches.push(parsed);
    }
  }

  // Return the first (most likely primary) amount
  return matches.length > 0 ? matches[0] : null;
}

function extractType(text: string): 'expense' | 'income' {
  const lowerText = text.toLowerCase();

  const debitScore = DEBIT_KEYWORDS.reduce(
    (score, keyword) => score + (lowerText.includes(keyword) ? 1 : 0),
    0,
  );

  const creditScore = CREDIT_KEYWORDS.reduce(
    (score, keyword) => score + (lowerText.includes(keyword) ? 1 : 0),
    0,
  );

  return creditScore > debitScore ? 'income' : 'expense';
}

function extractMerchant(text: string): string | null {
  for (const pattern of MERCHANT_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const merchant = match[1].trim();
      if (merchant.length > 1 && merchant.length < 50) {
        return merchant;
      }
    }
  }
  return null;
}

function extractDate(text: string): Date | null {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const parsed = new Date(match[1]);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }
  return null;
}

function calculateConfidence(
  amount: number | null,
  merchant: string | null,
  type: 'expense' | 'income',
  text: string,
): number {
  let confidence = 0;

  if (amount !== null) {
    confidence += 0.4;
  }
  if (merchant !== null) {
    confidence += 0.25;
  }

  const lowerText = text.toLowerCase();
  const hasKeywords = [...DEBIT_KEYWORDS, ...CREDIT_KEYWORDS].some(kw =>
    lowerText.includes(kw),
  );
  if (hasKeywords) {
    confidence += 0.2;
  }

  // Bonus for structured message format (banks usually have these)
  if (lowerText.includes('a/c') || lowerText.includes('account')) {
    confidence += 0.1;
  }
  if (/\b\d{4}\b/.test(text)) {
    confidence += 0.05; // last 4 digits of card/account
  }

  return Math.min(confidence, 1.0);
}

/**
 * Main parsing function — takes raw text from any source and returns
 * a structured ParsedTransaction.
 */
export function parseTransactionText(text: string): ParsedTransaction {
  const amount = extractAmount(text);
  const merchant = extractMerchant(text);
  const type = extractType(text);
  const date = extractDate(text);
  const confidence = calculateConfidence(amount, merchant, type, text);

  return {
    amount: amount ?? 0,
    merchant,
    date: date ?? new Date(),
    type,
    confidence,
  };
}

/**
 * Check if a notification text is likely a financial transaction.
 * Used by the headless notification listener to filter noise.
 */
export function isFinancialMessage(text: string): boolean {
  const lowerText = text.toLowerCase();
  const hasAmount = CURRENCY_REGEX.test(text);
  // Reset lastIndex since we used .test() with a global regex
  CURRENCY_REGEX.lastIndex = 0;

  const hasKeyword = [...DEBIT_KEYWORDS, ...CREDIT_KEYWORDS].some(kw =>
    lowerText.includes(kw),
  );

  return hasAmount && hasKeyword;
}
