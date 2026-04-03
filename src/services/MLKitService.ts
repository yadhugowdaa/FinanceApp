/**
 * MLKitService — Wrapper around Google ML Kit Text Recognition.
 * Runs entirely on-device, zero network calls.
 */

import TextRecognition from '@react-native-ml-kit/text-recognition';
import {parseTransactionText, type ParsedTransaction} from './ParserService';

export interface OCRResult {
  rawText: string;
  parsedTransaction: ParsedTransaction;
  blocks: string[];
}

/**
 * Process an image URI through ML Kit Text Recognition,
 * then pipe the output through the ParserService.
 */
export async function recognizeTextFromImage(
  imageUri: string,
): Promise<OCRResult> {
  try {
    const result = await TextRecognition.recognize(imageUri);

    const rawText = result.text;
    const blocks = result.blocks.map(block => block.text);

    // Run recognized text through our parser
    const parsedTransaction = parseTransactionText(rawText);

    return {
      rawText,
      parsedTransaction,
      blocks,
    };
  } catch (error) {
    console.error('ML Kit OCR Error:', error);
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
