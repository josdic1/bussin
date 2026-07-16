import { findEnabledPushSubscriptions } from "./push.repository.js";
import { sendPushNotification } from "./push.service.js";

export async function sendDriverMessageAlerts(
  message: string,
) {
  try {
    const subscriptions =
      await findEnabledPushSubscriptions();

    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await sendPushNotification(subscription, {
            title: "Driver update",
            body: message,
            url: "/",
          });
        } catch (error) {
          console.error(
            "Driver message alert delivery failed:",
            error,
          );
        }
      }),
    );
  } catch (error) {
    console.error(
      "Driver message alert check failed:",
      error,
    );
  }
}
