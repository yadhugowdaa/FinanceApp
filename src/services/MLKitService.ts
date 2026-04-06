import type {TextBlock} from '@react-native-ml-kit/text-recognition';
import type {ParsedTransaction} from './ParserService';

const BACKEND_URL = 'https://financeappbackend-rip3.onrender.com/api/parse-receipt';

export interface OCRResult {
  rawText: string;
  parsedTransaction: ParsedTransaction;
  blocks: TextBlock[];
}

/**
 * Uploads an image URI directly to our backend AI Microservice (Nvidia Gemma 3),
 * which returns a perfectly structured ParsedTransaction.
 */
export async function recognizeTextFromImage(
  imageUri: string,
): Promise<OCRResult> {
  try {
    const formData = new FormData();
    formData.append('receipt', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'receipt.jpg',
    } as any);

    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      body: formData as any,
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend Error: ${response.status}`);
    }

    const backendParsedTransaction = await response.json() as ParsedTransaction;

    return {
      rawText: "View notes for product breakdown (Processed by Nvidia AI)",
      parsedTransaction: backendParsedTransaction,
      blocks: [], // No longer using spatial bounding boxes
    };
  } catch (error) {
    console.error('AI Microservice Error:', error);
    return {
      rawText: '',
      parsedTransaction: {
        amount: 0,
        merchant: null,
        date: new Date(),
        type: 'expense',
        confidence: 0,
      },
      blocks: [],
    };
  }
}
