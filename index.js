/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {
  onNotificationReceived,
  RNAndroidNotificationListenerHeadlessJsName,
} from './src/background/NotificationTask';

// Register the main app component
AppRegistry.registerComponent(appName, () => App);

// Register the headless background task for Android notification listening.
// This runs even when the app is killed.
AppRegistry.registerHeadlessTask(
  RNAndroidNotificationListenerHeadlessJsName,
  () => onNotificationReceived,
);
