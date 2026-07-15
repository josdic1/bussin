import { useEffect, useState } from "react";
import { appConfig } from "../../../config";

const PARENT_CODE_STORAGE_KEY = "bussin.parentAccessCode";

type PushAlertControlProps = {
  travelMinutes: number;
  cushionMinutes: number;
};

type AlertState =
  | "CHECKING"
  | "OFF"
  | "ENABLING"
  | "ON"
  | "DISABLING"
  | "UNAVAILABLE";

function decodePublicKey(publicKey: string) {
  const padding = "=".repeat((4 - (publicKey.length % 4)) % 4);

  const base64 = (publicKey + padding).replace(/-/g, "+").replace(/_/g, "/");

  const raw = window.atob(base64);
  const bytes = new Uint8Array(raw.length);

  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }

  return bytes;
}

function getParentCode() {
  const parentCode = localStorage.getItem(PARENT_CODE_STORAGE_KEY);

  if (!parentCode) {
    throw new Error("Parent access code is missing.");
  }

  return parentCode;
}

async function saveSubscription(
  subscription: PushSubscription,
  travelMinutes: number,
  cushionMinutes: number,
) {
  const body = subscription.toJSON();

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    throw new Error("The browser did not provide a valid push subscription.");
  }

  const response = await fetch(
    `${appConfig.apiUrl}/api/parent/push/subscriptions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-parent-code": getParentCode(),
      },
      body: JSON.stringify({
        endpoint: body.endpoint,
        keys: body.keys,
        travelMinutes,
        cushionMinutes,
      }),
    },
  );

  const responseBody = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      responseBody?.error ?? "The leave alert could not be saved.",
    );
  }
}

export function PushAlertControl({
  travelMinutes,
  cushionMinutes,
}: PushAlertControlProps) {
  const [alertState, setAlertState] = useState<AlertState>("CHECKING");
  const [error, setError] = useState("");

  const isSupported =
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  useEffect(() => {
    if (!isSupported) {
      setAlertState("UNAVAILABLE");
      return;
    }

    navigator.serviceWorker
      .register("/push-sw.js")
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        setAlertState(subscription ? "ON" : "OFF");
      })
      .catch(() => {
        setAlertState("UNAVAILABLE");
      });
  }, [isSupported]);

  useEffect(() => {
    if (alertState !== "ON") {
      return;
    }

    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        if (!subscription) {
          setAlertState("OFF");
          return;
        }

        return saveSubscription(subscription, travelMinutes, cushionMinutes);
      })
      .catch((caughtError) => {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "The leave alert could not be updated.",
        );
      });
  }, [alertState, travelMinutes, cushionMinutes]);

  async function enableAlert() {
    setAlertState("ENABLING");
    setError("");

    try {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        throw new Error(
          "Notifications were not allowed. Enable them in your browser settings to receive leave alerts.",
        );
      }

      const registration = await navigator.serviceWorker.ready;

      const keyResponse = await fetch(
        `${appConfig.apiUrl}/api/parent/push/public-key`,
        {
          headers: {
            "x-parent-code": getParentCode(),
          },
        },
      );

      const keyBody = await keyResponse.json().catch(() => null);

      if (!keyResponse.ok || !keyBody?.publicKey) {
        throw new Error(
          keyBody?.error ?? "The notification key could not be loaded.",
        );
      }

      const existing = await registration.pushManager.getSubscription();

      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodePublicKey(keyBody.publicKey),
        }));

      await saveSubscription(subscription, travelMinutes, cushionMinutes);

      setAlertState("ON");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The leave alert could not be enabled.",
      );
      setAlertState("OFF");
    }
  }

  async function disableAlert() {
    setAlertState("DISABLING");
    setError("");

    try {
      const registration = await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await fetch(`${appConfig.apiUrl}/api/parent/push/subscriptions`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "x-parent-code": getParentCode(),
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
          }),
        });

        await subscription.unsubscribe();
      }

      setAlertState("OFF");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The leave alert could not be disabled.",
      );
      setAlertState("ON");
    }
  }

  if (alertState === "UNAVAILABLE") {
    return (
      <p className="pushAlertUnavailable">
        Leave notifications are unavailable in this browser.
      </p>
    );
  }

  return (
    <div className="pushAlertControl">
      {alertState === "ON" ? (
        <>
          <p className="pushAlertStatus">Leave alert is on</p>

          <button
            className="pushAlertButton"
            type="button"
            onClick={() => void disableAlert()}
          >
            Turn off
          </button>
        </>
      ) : (
        <button
          className="pushAlertButton"
          type="button"
          disabled={
            alertState === "CHECKING" ||
            alertState === "ENABLING" ||
            alertState === "DISABLING"
          }
          onClick={() => void enableAlert()}
        >
          {alertState === "ENABLING"
            ? "Turning on…"
            : alertState === "CHECKING"
              ? "Checking alerts…"
              : "Alert me when it’s time to leave"}
        </button>
      )}

      {error ? (
        <p className="pushAlertError" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
