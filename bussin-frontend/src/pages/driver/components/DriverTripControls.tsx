import {
  driverTripViewSchema,
  type DriverTripView,
} from "@bussin/shared";
import { useEffect, useState } from "react";
import { appConfig } from "../../../config";

const DRIVER_CODE_STORAGE_KEY = "bussin.driverAccessCode";

export function DriverTripControls() {
  const [trip, setTrip] = useState<DriverTripView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [action, setAction] = useState<"START" | "STOP" | null>(null);
  const [error, setError] = useState("");

  async function requestTrip(
    path = "",
    method: "GET" | "POST" = "GET",
  ) {
    const driverCode = localStorage.getItem(
      DRIVER_CODE_STORAGE_KEY,
    );

    if (!driverCode) {
      throw new Error("Driver access code is missing.");
    }

    const response = await fetch(
      `${appConfig.apiUrl}/api/driver/trip${path}`,
      {
        method,
        headers: {
          "x-driver-code": driverCode,
        },
      },
    );

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        body?.error ?? "The driver request could not be completed.",
      );
    }

    return driverTripViewSchema.parse(body);
  }

  useEffect(() => {
    requestTrip()
      .then(setTrip)
      .catch((caughtError) => {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not load the current trip.",
        );
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function handleAction(nextAction: "START" | "STOP") {
    setAction(nextAction);
    setError("");

    try {
      const nextTrip = await requestTrip(
        nextAction === "START" ? "/start" : "/stop",
        "POST",
      );

      setTrip(nextTrip);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The trip could not be updated.",
      );
    } finally {
      setAction(null);
    }
  }

  if (isLoading) {
    return <p className="tripStatus">Loading trip status…</p>;
  }

  const isSharing =
    trip?.status === "SHARING" || trip?.status === "STALE";

  return (
    <section className="tripControls">
      <p className="tripStatus">
        Status:{" "}
        <strong>
          {isSharing ? "Sharing location" : "Not sharing"}
        </strong>
      </p>

      {trip?.startedAt && isSharing ? (
        <p className="tripDetail">
          Started{" "}
          {new Date(trip.startedAt).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      ) : null}

      {error ? (
        <p className="formError" role="alert">
          {error}
        </p>
      ) : null}

      {isSharing ? (
        <button
          className="secondaryButton tripAction"
          type="button"
          disabled={action !== null}
          onClick={() => void handleAction("STOP")}
        >
          {action === "STOP" ? "Stopping…" : "Stop sharing"}
        </button>
      ) : (
        <button
          className="primaryButton tripAction"
          type="button"
          disabled={action !== null}
          onClick={() => void handleAction("START")}
        >
          {action === "START" ? "Starting…" : "Start sharing"}
        </button>
      )}
    </section>
  );
}
