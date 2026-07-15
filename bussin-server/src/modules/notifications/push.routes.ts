import { Router } from "express";
import { z } from "zod";
import { requireParentAccess } from "../../auth/access.js";
import { config } from "../../config.js";
import {
  disablePushSubscription,
  savePushSubscription,
} from "./push.repository.js";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  travelMinutes: z.number().int().min(1).max(180),
  cushionMinutes: z.number().int().min(0).max(60),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

export const parentPushRouter = Router();

parentPushRouter.use(requireParentAccess);

parentPushRouter.get("/public-key", (_request, response) => {
  response.json({
    publicKey: config.VAPID_PUBLIC_KEY,
  });
});

parentPushRouter.post(
  "/subscriptions",
  async (request, response, next) => {
    try {
      const parsed = subscriptionSchema.safeParse(request.body);

      if (!parsed.success) {
        response.status(400).json({
          error: "The push subscription is invalid.",
        });
        return;
      }

      await savePushSubscription({
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        authSecret: parsed.data.keys.auth,
        travelMinutes: parsed.data.travelMinutes,
        cushionMinutes: parsed.data.cushionMinutes,
      });

      response.status(201).json({ subscribed: true });
    } catch (error) {
      next(error);
    }
  },
);

parentPushRouter.delete(
  "/subscriptions",
  async (request, response, next) => {
    try {
      const parsed = unsubscribeSchema.safeParse(request.body);

      if (!parsed.success) {
        response.status(400).json({
          error: "The push subscription is invalid.",
        });
        return;
      }

      await disablePushSubscription(parsed.data.endpoint);
      response.json({ subscribed: false });
    } catch (error) {
      next(error);
    }
  },
);
