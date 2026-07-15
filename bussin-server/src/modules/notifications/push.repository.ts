import { databasePool } from "../../db/pool.js";

export type StoredPushSubscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth_secret: string;
  travel_minutes: number;
  cushion_minutes: number;
  last_notified_trip_id: string | null;
};

type SavePushSubscription = {
  endpoint: string;
  p256dh: string;
  authSecret: string;
  travelMinutes: number;
  cushionMinutes: number;
};

export async function savePushSubscription(
  subscription: SavePushSubscription,
) {
  await databasePool.query(
    `
      INSERT INTO parent_push_subscriptions (
        endpoint,
        p256dh,
        auth_secret,
        travel_minutes,
        cushion_minutes
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (endpoint)
      DO UPDATE SET
        p256dh = EXCLUDED.p256dh,
        auth_secret = EXCLUDED.auth_secret,
        travel_minutes = EXCLUDED.travel_minutes,
        cushion_minutes = EXCLUDED.cushion_minutes,
        enabled = true,
        updated_at = now()
    `,
    [
      subscription.endpoint,
      subscription.p256dh,
      subscription.authSecret,
      subscription.travelMinutes,
      subscription.cushionMinutes,
    ],
  );
}

export async function disablePushSubscription(
  endpoint: string,
) {
  await databasePool.query(
    `
      UPDATE parent_push_subscriptions
      SET
        enabled = false,
        updated_at = now()
      WHERE endpoint = $1
    `,
    [endpoint],
  );
}

export async function findEnabledPushSubscriptions() {
  const result =
    await databasePool.query<StoredPushSubscription>(`
      SELECT
        id,
        endpoint,
        p256dh,
        auth_secret,
        travel_minutes,
        cushion_minutes,
        last_notified_trip_id
      FROM parent_push_subscriptions
      WHERE enabled = true
      ORDER BY created_at
    `);

  return result.rows;
}

export async function markSubscriptionNotified(
  subscriptionId: string,
  tripId: string,
) {
  await databasePool.query(
    `
      UPDATE parent_push_subscriptions
      SET
        last_notified_trip_id = $2,
        updated_at = now()
      WHERE id = $1
    `,
    [subscriptionId, tripId],
  );
}
