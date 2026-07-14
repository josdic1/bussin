import {
  driverTripViewSchema,
  type DriverLocationUpdate,
  type DriverTripView,
} from "@bussin/shared";
import { useEffect, useState } from "react";
import { appConfig } from "../../../config";

const DRIVER_CODE_STORAGE_KEY = "bussin.driverAccessCode";

type LocationState =
  | "OFF"
  | "REQUESTING"
  | "LIVE"
  | "ERROR";

export function DriverTripControls() {
  const [trip, setTrip] = useState<DriverTripView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [action, setAction] = useState<"START" | "STOP" | null>(null);
  const [error, setError] = useState("");
  const [locationState, setLocationState] =
    useState<LocationState>("OFF");
  const [locationMessage, setLocationMessage] = useState("");

  async function requestTrip(
    path = "",
    method: "GET" | "POST" = "GET",
    body?: DriverLocationUpdate,
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
          ...(body
            ? { "Content-Type": "application/json" }
            : {}),
          "x-driver-code": driverCode,
        },
        body: body ? JSON.stringify(body) : undefined,
      },
    );

    const responseBody = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        responseBody?.error ??
          "The driver request could not be completed.",
      );
    }

    return driverTripViewSchema.parse(responseBody);
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

  const isSharing =
    trip?.status === "SHARING" || trip?.status === "STALE";

  useEffect(() => {
    if (!isSharing) {
      setLocationState("OFF");
      setLocationMessage("");
      return;
    }

    if (!navigator.geolocation) {
      setLocationState("ERROR");
      setLocationMessage(
        "This device does not provide browser location.",
      );
      return;
    }

    setLocationState("REQUESTING");
    setLocationMessage("Waiting for location permission…");

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location: DriverLocationUpdate = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
          headingDegrees:
            position.coords.heading === null ||
            !Number.isFinite(position.coords.heading)
              ? null
              : position.coords.heading,
          speedMetersPerSecond:
            position.coords.speed === null ||
            !Number.isFinite(position.coords.speed)
              ? null
              : position.coords.speed,
          recordedAt: new Date(position.timestamp).toISOString(),
        };

        requestTrip("/location", "POST", location)
          .then((nextTrip) => {
            setTrip(nextTrip);
            setLocationState("LIVE");
            setLocationMessage(
              `Location live · accuracy ${Math.round(
                position.coords.accuracy,
              )} m`,
            );
          })
          .catch((caughtError) => {
            setLocationState("ERROR");
            setLocationMessage(
              caughtError instanceof Error
                ? caughtError.message
                : "Could not send the current location.",
            );
          });
      },
      (locationError) => {
        setLocationState("ERROR");

        if (locationError.code === locationError.PERMISSION_DENIED) {
          setLocationMessage(
            "Location permission was denied. Allow location access and try again.",
          );
          return;
        }

        setLocationMessage(
          "The device could not determine its location.",
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5_000,
        timeout: 15_000,
      },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isSharing]);

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

      {isSharing ? (
        <p
          className={
            locationState === "ERROR"
              ? "formError"
              : "tripDetail"
          }
        >
          {locationMessage}
        </p>
      ) : null}

      {trip?.location && isSharing ? (
        <p className="tripDetail">
          Last update{" "}
          {new Date(
            trip.location.recordedAt,
          ).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
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
