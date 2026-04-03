/**
 * ParserService — Pure function engine for extracting transaction data
 * from raw text (SMS, notifications, OCR output, or pasted messages).
 *
 * Handles Indian and Global currency formats:
 * ₹, Rs, Rs., INR, $, USD, EUR, €
 */
import type {TextBlock} from '@react-native-ml-kit/text-recognition';

export interface ParsedTransaction {
  amount: number;
  merchant: string | null;
  date: Date | null;
  type: 'expense' | 'income';
  confidence: number; // 0.0 - 1.0
  extractedItems?: string; // Formatted list of identified products
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
 * Spatial heuristic parser for 2D printed receipts.
 * Finds the true Total by looking rightwards from the word "TOTAL".
 * Finds the Merchant by grabbing the topmost text block.
 */
function parseReceiptSpatial(
  text: string,
  blocks: TextBlock[],
): ParsedTransaction | null {
  if (!blocks || blocks.length === 0) return null;

  // 1. Find Merchant (usually at the very top of the receipt)
  // Sort blocks top-to-bottom
  const sortedByTop = [...blocks]
    .filter(b => b.frame) // Ensure they have bounding boxes
    .sort((a, b) => (a.frame?.top ?? 0) - (b.frame?.top ?? 0));

  let merchant: string | null = null;
  for (const block of sortedByTop) {
    const txt = block.text.trim();
    // Ignore generic header words
    if (!/^(tax\s*invoice|receipt|cash\s*memo|bill)$/i.test(txt) && txt.length > 2) {
      merchant = txt;
      break;
    }
  }

  // 2. Find Total Amount
  // Look for the block containing "TOTAL" or "GRAND TOTAL"
  let totalAmount: number | null = null;
  const totalLabelBlock = blocks.find(b =>
    /\b(total|grand\s*total|amount\s*payable|net\s*amount)\b/i.test(b.text),
  );

  if (totalLabelBlock && totalLabelBlock.frame) {
    const rTop = totalLabelBlock.frame.top;
    const rHeight = totalLabelBlock.frame.height;
    
    // Find all blocks that are roughly on the same horizontal line
    const alignedBlocks = blocks.filter(b => {
      if (!b.frame || b === totalLabelBlock) return false;
      // Allow a vertical deviation of about half the height of the text
      const diff = Math.abs(b.frame.top - rTop);
      return diff < rHeight * 0.8;
    });

    // Look for a number in those horizontally aligned blocks
    let maxLeft = -1;
    for (const b of alignedBlocks) {
      // Find the right-most block on this line that looks like a number
      if (b.frame && b.frame.left > totalLabelBlock.frame.left) {
        // Look for numbers like 4958.00, 4,958.00, Rs. 4958
        const match = b.text.match(/\d[\d,]*\.?\d{0,2}/);
        if (match) {
          const parsed = parseFloat(match[0].replace(/,/g, ''));
          if (!isNaN(parsed) && b.frame.left > maxLeft) {
            totalAmount = parsed;
            maxLeft = b.frame.left; // Prioritize the one furthest to the right
          }
        }
      }
    }
  }

  // 3. Attempt to extract line items (Fragile heuristic)
  // Look for text blocks that start with "1.", "2.", or common item indicators
  // between the merchant header and the totals section.
  const items: string[] = [];
  if (totalLabelBlock?.frame) {
    const bottomLimit = totalLabelBlock.frame.top;
    
    // Sort all blocks purely vertically
    const bodyBlocks = sortedByTop.filter(b => 
      b.frame && 
      b.frame.top > (sortedByTop[0].frame?.top ?? 0) + 20 && // Below merchant
      b.frame.top < bottomLimit - 20 // Above total
    );

    let currentItem = '';
    for (const b of bodyBlocks) {
      const txt = b.text.trim();
      // If line starts with "1.", "2.", etc., start a new item
      if (/^\d+\.\s+[A-Za-z]/.test(txt)) {
        if (currentItem) items.push(currentItem.trim());
        currentItem = txt;
      } else if (currentItem) {
        // Append details (like "Qty:5 x Un:90") to the current item
        // Ignore long barcodes or dates to keep notes clean
        if (txt.length < 30 && !/^[A-Z0-9]{15,}$/.test(txt)) {
           currentItem += ` | ${txt}`;
        }
      }
    }
    if (currentItem) items.push(currentItem.trim());
  }

  const extractedItems = items.length > 0 
    ? "Detected Items:\n" + items.join('\n') 
    : undefined;

  // If spatial logic found a total, return it. Otherwise, return null to fallback to generic regex.
  if (totalAmount !== null) {
    const type = extractType(text);
    const date = extractDate(text);
    return {
      amount: totalAmount,
      merchant,
      date: date ?? new Date(),
      type,
      confidence: 0.9,
      extractedItems,
    };
  }

  return null;
}

/**
 * Main parsing function — takes raw text from any source and returns
 * a structured ParsedTransaction. If spatial blocks are provided, uses
 * advanced 2D heuristics before falling back to regex.
 */
export function parseTransactionText(
  text: string,
  blocks?: TextBlock[],
): ParsedTransaction {
  // Try 2D spatial extraction first if blocks are available
  if (blocks && blocks.length > 0) {
    const spatialResult = parseReceiptSpatial(text, blocks);
    if (spatialResult) {
      return spatialResult;
    }
  }

  // Fallback to 1D regex extraction
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
