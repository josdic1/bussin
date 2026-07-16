import type { Coordinate } from "@bussin/shared";
import { getArrivalEstimate } from "../routing/eta.service.js";
import {
  findEnabledPushSubscriptions,
  markSubscriptionNotified,
} from "./push.repository.js";
import { sendPushNotification } from "./push.service.js";

export async function checkLeaveAlerts(
  tripId: string,
  busLocation: Coordinate,
) {
  try {
    const subscriptions = await findEnabledPushSubscriptions();

    const pending = subscriptions.filter(
      (subscription) =>
        subscription.last_notified_trip_id !== tripId,
    );

    if (pending.length === 0) {
      return;
    }

    const estimate = await getArrivalEstimate(busLocation);
    const etaMinutes = estimate.durationSeconds / 60;

    for (const subscription of pending) {
      const threshold =
        subscription.travel_minutes +
        subscription.cushion_minutes;

      if (etaMinutes > threshold) {
        continue;
      }

      const delivered = await sendPushNotification(
        subscription,
        {
          title: "Time to leave",
          body: `The bus is about ${Math.max(
            1,
            Math.round(etaMinutes),
          )} min away. Head out now.`,
          url: "/",
        },
      );

      if (delivered) {
        await markSubscriptionNotified(
          subscription.id,
          tripId,
        );
      }
    }
  } catch (error) {
    console.error("Leave alert check failed:", error);
  }
}
