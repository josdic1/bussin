import webPush from "web-push";
import { config } from "../../config.js";
import {
  disablePushSubscription,
  type StoredPushSubscription,
} from "./push.repository.js";

webPush.setVapidDetails(
  config.VAPID_SUBJECT,
  config.VAPID_PUBLIC_KEY,
  config.VAPID_PRIVATE_KEY,
);

type PushMessage = {
  title: string;
  body: string;
  url?: string;
};

export async function sendPushNotification(
  subscription: StoredPushSubscription,
  message: PushMessage,
) {
  try {
    await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth_secret,
        },
      },
      JSON.stringify(message),
    );

    return true;
  } catch (error) {
    const statusCode =
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error
        ? error.statusCode
        : null;

    if (statusCode === 404 || statusCode === 410) {
      await disablePushSubscription(subscription.endpoint);
      return false;
    }

    throw error;
  }
}
