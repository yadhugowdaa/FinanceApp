/**
 * NotificationTask — Headless JS background task.
 *
 * Listens to Android OS notifications. When a bank/UPI notification
 * arrives, it silently parses the text and saves the transaction
 * directly to WatermelonDB — even when the app is fully closed.
 */

import {
  RNAndroidNotificationListenerHeadlessJsName,
} from 'react-native-android-notification-listener';
import {isFinancialMessage, parseTransactionText} from '../services/ParserService';
import {database, transactionsCollection, usersCollection, categoriesCollection} from '../database';
import {Q} from '@nozbe/watermelondb';

interface NotificationPayload {
  app: string;
  title: string;
  text: string;
  time: string;
}

/**
 * The headless task that Android calls when a notification is received.
 * This runs outside of React lifecycle — no hooks, no state, no UI.
 */
async function onNotificationReceived(notification: NotificationPayload) {
  try {
    const {text, title, app} = notification;
    const fullText = `${title} ${text}`;

    // Step 1: Filter out non-financial notifications
    if (!isFinancialMessage(fullText)) {
      return;
    }

    // Step 2: Parse the notification text
    const parsed = parseTransactionText(fullText);

    // Step 3: Only save if we have a meaningful amount
    if (parsed.amount <= 0 || parsed.confidence < 0.3) {
      return;
    }

    // Step 4: Get the current user (first user in local DB)
    const users = await usersCollection.query().fetch();
    if (users.length === 0) {
      return; // No user logged in
    }
    const userId = users[0].id;

    // Step 5: Find a default category (or use "Other")
    const otherCategory = await categoriesCollection
      .query(
        Q.where('name', 'Other'),
        Q.where('type', parsed.type),
      )
      .fetch();

    const categoryId = otherCategory[0]?.id ?? '';

    // Step 6: Save to WatermelonDB
    await database.write(async () => {
      await transactionsCollection.create(record => {
        record.amount = parsed.amount;
        record.merchant = parsed.merchant ?? app ?? 'Unknown';
        record.notes = `Auto-captured from notification: ${title}`;
        record.date = parsed.date ?? new Date();
        record.type = parsed.type;
        record.source = 'notification';
        record.categoryId = categoryId;
        record.userId = userId;
      });
    });

    console.log(
      `[NotificationTask] Saved ${parsed.type}: ₹${parsed.amount} at ${parsed.merchant}`,
    );
  } catch (error) {
    console.error('[NotificationTask] Error:', error);
  }
}

export {onNotificationReceived, RNAndroidNotificationListenerHeadlessJsName};
