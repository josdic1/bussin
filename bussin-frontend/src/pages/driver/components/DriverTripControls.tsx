import {
  driverTripViewSchema,
  type DriverLocationUpdate,
  type DriverTripView,
} from "@bussin/shared";
import { MapPin } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { appConfig } from "../../../config";

const DRIVER_CODE_STORAGE_KEY = "bussin.driverAccessCode";

function formatMessageTime(
  sentAt: string | null | undefined,
) {
  if (!sentAt) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(sentAt));
}

const MESSAGE_PRESETS = [
  { message: "LEAVING THE JCC!", lines: ["LEAVING", "THE JCC!"] },
  { message: "JUST ARRIVED AT CDR!", lines: ["JUST ARRIVED", "AT CDR!"] },
  { message: "JUST LEFT CDR!", lines: ["JUST LEFT", "CDR!"] },
  { message: "ETA 10 MIN", lines: ["ETA 10 MIN"] },
];

type LocationState = "OFF" | "REQUESTING" | "LIVE" | "ERROR";

export function DriverTripControls() {
  const [trip, setTrip] = useState<DriverTripView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tripAction, setTripAction] = useState<"START" | "STOP" | null>(null);
  const [isSavingMessage, setIsSavingMessage] = useState(false);
  const [error, setError] = useState("");
  const [locationState, setLocationState] = useState<LocationState>("OFF");
  const [locationMessage, setLocationMessage] = useState("");
  const [locationSession, setLocationSession] = useState(0);
  const [messageDraft, setMessageDraft] = useState("");

  const lastLocationRef = useRef<DriverLocationUpdate | null>(null);
  const messageInitializedRef = useRef(false);

  const [tripLoadedAt, setTripLoadedAt] = useState(Date.now());
  const [clockMilliseconds, setClockMilliseconds] = useState(Date.now());

  async function requestTrip(
    path = "",
    method: "GET" | "POST" = "GET",
    body?: unknown,
  ) {
    const driverCode = localStorage.getItem(DRIVER_CODE_STORAGE_KEY);

    if (!driverCode) {
      throw new Error("Driver access code is missing.");
    }

    const response = await fetch(`${appConfig.apiUrl}/api/driver/trip${path}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        "x-driver-code": driverCode,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseBody = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        responseBody?.error ?? "The driver request could not be completed.",
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

    const refreshInterval = window.setInterval(() => void refreshTrip(), 5_000);

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

  const isSharing = trip?.status === "SHARING" || trip?.status === "STALE";

  const secondsSinceLastContact = trip?.location
    ? Math.max(
        0,
        Math.floor(
          trip.location.ageSeconds + (clockMilliseconds - tripLoadedAt) / 1000,
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
      setLocationMessage("This device does not provide browser location.");
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

        if (locationError.code === locationError.PERMISSION_DENIED) {
          setLocationMessage(
            "Location access is blocked. Allow it and keep this page open.",
          );
          return;
        }

        setLocationMessage("The device could not determine its location.");
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
  }, [isSharing, locationSession]);

  function resetLocation() {
    lastLocationRef.current = null;
    setLocationState("REQUESTING");
    setLocationMessage("Resetting location…");
    setLocationSession((session) => session + 1);
  }

  async function handleTripAction(nextAction: "START" | "STOP") {
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

      const nextTrip = await requestTrip("/message", "POST", {
        message: normalizedMessage || null,
      });

      setTrip(nextTrip);
      setTripLoadedAt(Date.now());
      setMessageDraft("");
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

  function submitCustomMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void saveMessage(messageDraft);
  }

  if (isLoading) {
    return <p className="driverLoading">Loading driver controls…</p>;
  }

  const statusLabel =
    trip?.status === "STALE"
      ? "GPS NEEDS ATTENTION"
      : isSharing
        ? "LOCATION IS LIVE"
        : "TRIP IS OFF";

  const hasLocationProblem =
    trip?.status === "STALE" || locationState === "ERROR";

  const tripActionLabel =
    tripAction === "START"
      ? "STARTING…"
      : tripAction === "STOP"
        ? "STOPPING…"
        : isSharing
          ? "STOP SHARING"
          : "START SHARING";

  return (
    <main className="driverDashboard">
      <header className="driverDashboardBar">
        <strong>DRIVER CONTROL</strong>
        <span className={isSharing ? "isLive" : ""}>
          {isSharing ? "● LIVE TRIP" : "○ TRIP OFF"}
        </span>
      </header>

      <section
        className={`driverDashboardStatus ${
          hasLocationProblem
            ? "driverDashboardStatusProblem"
            : isSharing
              ? "driverDashboardStatusLive"
              : ""
        }`}
        aria-live="polite"
      >
        <div className="driverDashboardStatusHeading">
          <span
            className={`driverLocationBeacon${
              isSharing && !hasLocationProblem
                ? " driverLocationBeaconLive"
                : hasLocationProblem
                  ? " driverLocationBeaconProblem"
                  : ""
            }`}
            aria-hidden="true"
          >
            <MapPin />
          </span>

          <div>
            <p className="driverDashboardKicker">Current status</p>
            <p className="driverDashboardStatusLabel">{statusLabel}</p>
          </div>
        </div>

        {isSharing ? (
          <div className="driverDashboardStatusUtility">
            <span>{locationMessage}</span>
            {secondsSinceLastContact !== null ? (
              <strong>UPDATED {secondsSinceLastContact} SEC AGO</strong>
            ) : null}

            <button type="button" onClick={resetLocation}>
              Reset location
            </button>
          </div>
        ) : (
          <div className="driverDashboardStatusUtility">
            <span>Parents cannot see a live bus location.</span>
          </div>
        )}
      </section>

      {error ? (
        <p className="driverDashboardError" role="alert">
          {error}
        </p>
      ) : null}

      <button
        className={`driverDashboardTripAction ${
          isSharing ? "driverDashboardStopAction" : "driverDashboardStartAction"
        }`}
        type="button"
        disabled={tripAction !== null}
        onClick={() => void handleTripAction(isSharing ? "STOP" : "START")}
      >
        {tripActionLabel}
      </button>

      {isSharing ? (
        <section className="driverDashboardMessages">
          <header className="driverDashboardMessageHeader">
            <div>
              <p className="driverDashboardKicker">Parent update</p>
              <h2>SEND A MESSAGE</h2>
            </div>

            <button
              className="driverDashboardClear"
              type="button"
              disabled={isSavingMessage || !trip?.driverMessage}
              onClick={() => void saveMessage("")}
            >
              CLEAR
            </button>
          </header>

          <div className="driverDashboardCurrentMessage">
            <span className="driverDashboardMessageIcon" aria-hidden="true">
              •••
            </span>
            <p>
              <small>
                LIVE PARENT MESSAGE
                {trip?.driverMessageUpdatedAt
                  ? ` • ${formatMessageTime(
                      trip.driverMessageUpdatedAt,
                    )}`
                  : ""}
              </small>
              <strong>{trip?.driverMessage || "No active message"}</strong>
            </p>
          </div>

          <div className="driverDashboardPresetGrid">
            {MESSAGE_PRESETS.map((preset, index) => (
              <button
                key={preset.message}
                className="driverDashboardPreset"
                type="button"
                disabled={isSavingMessage}
                onClick={() => void saveMessage(preset.message)}
              >
                <span aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <strong>
                  {preset.lines.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </strong>
                <b aria-hidden="true">›</b>
              </button>
            ))}
          </div>

          <form
            className="driverDashboardCustomMessage"
            onSubmit={submitCustomMessage}
          >
            <label htmlFor="driver-message">CUSTOM UPDATE</label>

            <div className="driverDashboardMessageInput">
              <textarea
                id="driver-message"
                rows={2}
                maxLength={160}
                value={messageDraft}
                placeholder="Type a short parent update"
                onChange={(event) => setMessageDraft(event.target.value)}
              />

              <button
                type="submit"
                disabled={isSavingMessage || !messageDraft.trim()}
              >
                {isSavingMessage ? "SENDING…" : "SEND ›"}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="driverDashboardOffNote">
          <span aria-hidden="true">●</span>
          <p>
            <small>PARENT TRACKER</small>
            <strong>Location and messages appear after sharing starts.</strong>
          </p>
        </section>
      )}
    </main>
  );
}
