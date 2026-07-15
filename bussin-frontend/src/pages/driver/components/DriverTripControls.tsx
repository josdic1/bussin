import {
  driverTripViewSchema,
  type DriverLocationUpdate,
  type DriverTripView,
} from "@bussin/shared";
import { useEffect, useRef, useState } from "react";
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
  const lastLocationRef = useRef<DriverLocationUpdate | null>(null);
  const [tripLoadedAt, setTripLoadedAt] = useState(Date.now());
  const [clockMilliseconds, setClockMilliseconds] = useState(
    Date.now(),
  );

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
    let isActive = true;

    async function refreshTrip() {
      try {
        const nextTrip = await requestTrip();

        if (isActive) {
          setTrip(nextTrip);
          setTripLoadedAt(Date.now());
          setError("");
        }
      } catch (caughtError) {
        if (isActive) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Could not load the current trip.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void refreshTrip();

    const refreshInterval = window.setInterval(
      () => void refreshTrip(),
      5_000,
    );

    return () => {
      isActive = false;
      window.clearInterval(refreshInterval);
    };
  }, []);

  useEffect(() => {
    const clockTimer = window.setInterval(() => {
      setClockMilliseconds(Date.now());
    }, 1_000);

    return () => {
      window.clearInterval(clockTimer);
    };
  }, []);

  const isSharing =
    trip?.status === "SHARING" || trip?.status === "STALE";

  const secondsSinceLastContact = trip?.location
    ? Math.max(
        0,
        Math.floor(
          trip.location.ageSeconds +
            (clockMilliseconds - tripLoadedAt) / 1000,
        ),
      )
    : null;

  useEffect(() => {
    if (!isSharing) {
      lastLocationRef.current = null;
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

        lastLocationRef.current = location;

        requestTrip("/location", "POST", location)
          .then((nextTrip) => {
            setTrip(nextTrip);
            setTripLoadedAt(Date.now());
            setLocationState("LIVE");
            setLocationMessage(
              `Location live · accuracy about ${Math.round(
                position.coords.accuracy * 3.28084,
              )} ft`,
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

    const heartbeatTimer = window.setInterval(() => {
      const lastLocation = lastLocationRef.current;

      if (!lastLocation) {
        return;
      }

      requestTrip("/location", "POST", lastLocation)
        .then((nextTrip) => {
          setTrip(nextTrip);
          setTripLoadedAt(Date.now());
        })
        .catch((caughtError) => {
          setLocationState("ERROR");
          setLocationMessage(
            caughtError instanceof Error
              ? caughtError.message
              : "The location heartbeat could not be sent.",
          );
        });
    }, 10_000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      window.clearInterval(heartbeatTimer);
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

      setTripLoadedAt(Date.now());
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
          {trip?.status === "STALE"
            ? "Location signal is stale"
            : isSharing
              ? "Sharing location"
              : "Not sharing"}
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
            locationState === "ERROR" ||
            trip?.status === "STALE"
              ? "formError"
              : "tripDetail"
          }
        >
          {trip?.status === "STALE"
            ? "Location has not updated recently. Keep this page open and check location access."
            : locationMessage}
        </p>
      ) : null}

      {secondsSinceLastContact !== null && isSharing ? (
        <p className="tripDetail">
          Updated{" "}
          {secondsSinceLastContact === 0
            ? "just now"
            : `${secondsSinceLastContact} ${
                secondsSinceLastContact === 1
                  ? "second"
                  : "seconds"
              } ago`}
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
