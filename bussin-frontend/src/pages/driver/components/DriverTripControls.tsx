import {
  driverTripViewSchema,
  type DriverLocationUpdate,
  type DriverTripView,
} from "@bussin/shared";
import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { appConfig } from "../../../config";

const DRIVER_CODE_STORAGE_KEY = "bussin.driverAccessCode";

const MESSAGE_PRESETS = [
  "Running on time.",
  "Traffic delay — running about 10 minutes late.",
  "Leaving the JCC soon.",
  "Please check the tracker for the latest location.",
];

type LocationState =
  | "OFF"
  | "REQUESTING"
  | "LIVE"
  | "ERROR";

export function DriverTripControls() {
  const [trip, setTrip] = useState<DriverTripView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tripAction, setTripAction] =
    useState<"START" | "STOP" | null>(null);
  const [isSavingMessage, setIsSavingMessage] =
    useState(false);
  const [error, setError] = useState("");
  const [locationState, setLocationState] =
    useState<LocationState>("OFF");
  const [locationMessage, setLocationMessage] =
    useState("");
  const [messageDraft, setMessageDraft] = useState("");

  const lastLocationRef =
    useRef<DriverLocationUpdate | null>(null);
  const messageInitializedRef = useRef(false);

  const [tripLoadedAt, setTripLoadedAt] =
    useState(Date.now());
  const [clockMilliseconds, setClockMilliseconds] =
    useState(Date.now());

  async function requestTrip(
    path = "",
    method: "GET" | "POST" = "GET",
    body?: unknown,
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

    const responseBody =
      await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        responseBody?.error ??
          "The driver request could not be completed.",
      );
    }

    return driverTripViewSchema.parse(responseBody);
  }

  function acceptTrip(nextTrip: DriverTripView) {
    setTrip(nextTrip);
    setTripLoadedAt(Date.now());

    if (!messageInitializedRef.current) {
      setMessageDraft(nextTrip.driverMessage ?? "");
      messageInitializedRef.current = true;
    }
  }

  useEffect(() => {
    let isActive = true;

    async function refreshTrip() {
      try {
        const nextTrip = await requestTrip();

        if (isActive) {
          acceptTrip(nextTrip);
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

    return () => window.clearInterval(clockTimer);
  }, []);

  const isSharing =
    trip?.status === "SHARING" ||
    trip?.status === "STALE";

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
          recordedAt: new Date(
            position.timestamp,
          ).toISOString(),
        };

        lastLocationRef.current = location;

        requestTrip("/location", "POST", location)
          .then((nextTrip) => {
            acceptTrip(nextTrip);
            setLocationState("LIVE");
            setLocationMessage(
              `Accuracy about ${Math.round(
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

        if (
          locationError.code ===
          locationError.PERMISSION_DENIED
        ) {
          setLocationMessage(
            "Location access is blocked. Allow it and keep this page open.",
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
        .then(acceptTrip)
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

  async function handleTripAction(
    nextAction: "START" | "STOP",
  ) {
    setTripAction(nextAction);
    setError("");

    try {
      const nextTrip = await requestTrip(
        nextAction === "START" ? "/start" : "/stop",
        "POST",
      );

      acceptTrip(nextTrip);

      if (nextAction === "STOP") {
        setMessageDraft("");
        messageInitializedRef.current = false;
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The trip could not be updated.",
      );
    } finally {
      setTripAction(null);
    }
  }

  async function saveMessage(message: string) {
    setIsSavingMessage(true);
    setError("");

    try {
      const normalizedMessage = message.trim();

      const nextTrip = await requestTrip(
        "/message",
        "POST",
        {
          message: normalizedMessage || null,
        },
      );

      setTrip(nextTrip);
      setTripLoadedAt(Date.now());
      setMessageDraft(nextTrip.driverMessage ?? "");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The parent update could not be sent.",
      );
    } finally {
      setIsSavingMessage(false);
    }
  }

  function submitCustomMessage(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    void saveMessage(messageDraft);
  }

  if (isLoading) {
    return (
      <p className="driverLoading">
        Loading driver controls…
      </p>
    );
  }

  const statusLabel =
    trip?.status === "STALE"
      ? "GPS NEEDS ATTENTION"
      : isSharing
        ? "LOCATION IS LIVE"
        : "TRIP IS OFF";

  return (
    <section className="driverTripControls">
      <section
        className={`driverStatusPanel ${
          trip?.status === "STALE" ||
          locationState === "ERROR"
            ? "driverStatusProblem"
            : isSharing
              ? "driverStatusLive"
              : ""
        }`}
        aria-live="polite"
      >
        <p className="driverStatusEyebrow">Current status</p>
        <p className="driverStatusLabel">{statusLabel}</p>

        {isSharing ? (
          <div className="driverStatusDetails">
            <span>{locationMessage}</span>
            {secondsSinceLastContact !== null ? (
              <strong>
                Updated {secondsSinceLastContact} seconds ago
              </strong>
            ) : null}
          </div>
        ) : (
          <p className="driverStatusDetails">
            Parents cannot see a live bus location.
          </p>
        )}
      </section>

      {error ? (
        <p className="driverError" role="alert">
          {error}
        </p>
      ) : null}

      <button
        className={`driverTripButton ${
          isSharing
            ? "driverStopButton"
            : "driverStartButton"
        }`}
        type="button"
        disabled={tripAction !== null}
        onClick={() =>
          void handleTripAction(
            isSharing ? "STOP" : "START",
          )
        }
      >
        {tripAction === "START"
          ? "STARTING…"
          : tripAction === "STOP"
            ? "STOPPING…"
            : isSharing
              ? "STOP SHARING"
              : "START SHARING"}
      </button>

      {isSharing ? (
        <section className="driverMessagePanel">
          <div className="driverMessageHeading">
            <div>
              <p className="driverStatusEyebrow">
                Parent update
              </p>
              <h2>Send a message</h2>
            </div>

            {trip?.driverMessage ? (
              <button
                className="driverClearMessage"
                type="button"
                disabled={isSavingMessage}
                onClick={() => void saveMessage("")}
              >
                Clear
              </button>
            ) : null}
          </div>

          {trip?.driverMessage ? (
            <p className="driverCurrentMessage">
              Live: <strong>{trip.driverMessage}</strong>
            </p>
          ) : null}

          <div className="driverPresetGrid">
            {MESSAGE_PRESETS.map((preset) => (
              <button
                key={preset}
                className="driverPresetButton"
                type="button"
                disabled={isSavingMessage}
                onClick={() => void saveMessage(preset)}
              >
                {preset}
              </button>
            ))}
          </div>

          <form
            className="driverCustomMessage"
            onSubmit={submitCustomMessage}
          >
            <label htmlFor="driver-message">
              Custom update
            </label>

            <div className="driverMessageInputRow">
              <input
                id="driver-message"
                type="text"
                maxLength={160}
                value={messageDraft}
                placeholder="Type a short parent update"
                onChange={(event) =>
                  setMessageDraft(event.target.value)
                }
              />

              <button
                type="submit"
                disabled={
                  isSavingMessage ||
                  !messageDraft.trim()
                }
              >
                {isSavingMessage ? "SENDING…" : "SEND"}
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </section>
  );
}
