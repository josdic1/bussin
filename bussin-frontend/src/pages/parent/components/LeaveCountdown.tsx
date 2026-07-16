import { CalendarClock, MapPin, Power, RefreshCw, X } from "lucide-react";
import type { ArrivalEstimate } from "@bussin/shared";
import { type FormEvent, useEffect, useState } from "react";
import { appConfig } from "../../../config";
import { PushAlertControl } from "./PushAlertControl";

const STORAGE_KEY = "bussin.parentLeavePreferences";
const PARENT_CODE_STORAGE_KEY = "bussin.parentAccessCode";

type LeavePreferences = {
  travelMinutes: number;
  cushionMinutes: number;
  usesCurrentLocation: boolean;
};

type LeaveCountdownProps = {
  estimate: ArrivalEstimate;
};

function loadPreferences(): LeavePreferences | null {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored);

    if (
      typeof parsed.travelMinutes !== "number" ||
      typeof parsed.cushionMinutes !== "number"
    ) {
      return null;
    }

    return {
      travelMinutes: parsed.travelMinutes,
      cushionMinutes: parsed.cushionMinutes,
      usesCurrentLocation: parsed.usesCurrentLocation === true,
    };
  } catch {
    return null;
  }
}

function getCurrentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("This device does not provide location."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 30_000,
      timeout: 15_000,
    });
  });
}

export function LeaveCountdown({ estimate }: LeaveCountdownProps) {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [preferences, setPreferences] = useState<LeavePreferences | null>(
    loadPreferences,
  );
  const [isEditing, setIsEditing] = useState(preferences === null);
  const [travelMinutes, setTravelMinutes] = useState(
    preferences?.travelMinutes ?? 15,
  );
  const [cushionMinutes, setCushionMinutes] = useState(
    preferences?.cushionMinutes ?? 5,
  );
  const [usesCurrentLocation, setUsesCurrentLocation] = useState(
    preferences?.usesCurrentLocation ?? false,
  );
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [isLocationPanelOpen, setIsLocationPanelOpen] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1_000);

    return () => window.clearInterval(timer);
  }, []);

  async function calculateMyDrive() {
    setIsLocating(true);
    setLocationError("");

    try {
      const parentCode = localStorage.getItem(PARENT_CODE_STORAGE_KEY);

      if (!parentCode) {
        throw new Error("Parent access code is missing.");
      }

      const position = await getCurrentPosition();

      const response = await fetch(
        `${appConfig.apiUrl}/api/parent/trip/travel-estimate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-parent-code": parentCode,
          },
          body: JSON.stringify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        },
      );

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          body?.error ?? "Your drive time could not be calculated.",
        );
      }

      const nextTravelMinutes = Math.max(
        1,
        Math.ceil(body.durationSeconds / 60),
      );

      setTravelMinutes(nextTravelMinutes);
      setUsesCurrentLocation(true);

      return nextTravelMinutes;
    } catch (caughtError) {
      let message = "Your location could not be used.";

      if (
        typeof caughtError === "object" &&
        caughtError !== null &&
        "code" in caughtError &&
        caughtError.code === 1
      ) {
        message =
          "Location permission was denied. You can enter your drive time manually.";
      } else if (caughtError instanceof Error) {
        message = caughtError.message;
      }

      setLocationError(message);
      return null;
    } finally {
      setIsLocating(false);
    }
  }

  async function enableOrResetCurrentLocation() {
    const nextTravelMinutes = await calculateMyDrive();

    if (nextTravelMinutes === null) {
      return;
    }

    const nextPreferences = {
      travelMinutes: nextTravelMinutes,
      cushionMinutes: preferences?.cushionMinutes ?? cushionMinutes,
      usesCurrentLocation: true,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPreferences));
    setPreferences(nextPreferences);
    setTravelMinutes(nextTravelMinutes);
    setUsesCurrentLocation(true);
    setIsLocationPanelOpen(false);
  }

  function disableCurrentLocation() {
    const nextPreferences = {
      travelMinutes: preferences?.travelMinutes ?? travelMinutes,
      cushionMinutes: preferences?.cushionMinutes ?? cushionMinutes,
      usesCurrentLocation: false,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPreferences));
    setPreferences(nextPreferences);
    setUsesCurrentLocation(false);
    setLocationError("");
    setIsLocationPanelOpen(false);
  }

  function savePreferences(event: FormEvent) {
    event.preventDefault();

    const nextPreferences = {
      travelMinutes,
      cushionMinutes,
      usesCurrentLocation,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPreferences));

    setPreferences(nextPreferences);
    setIsEditing(false);
  }

  function startEditing() {
    setTravelMinutes(preferences?.travelMinutes ?? 15);
    setCushionMinutes(preferences?.cushionMinutes ?? 5);
    setUsesCurrentLocation(preferences?.usesCurrentLocation ?? false);
    setLocationError("");
    setIsEditing(true);
  }

  function cancelEditing() {
    if (!preferences) {
      return;
    }

    setTravelMinutes(preferences.travelMinutes);
    setCushionMinutes(preferences.cushionMinutes);
    setUsesCurrentLocation(preferences.usesCurrentLocation);
    setLocationError("");
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <form className="leavePreferences" onSubmit={savePreferences}>
        <p className="arrivalLabel">When should we tell you to leave?</p>

        <button
          className="locationTimingButton"
          type="button"
          disabled={isLocating}
          onClick={() => void calculateMyDrive()}
        >
          <MapPin aria-hidden="true" />
          {isLocating ? "Calculating your drive…" : "Use my current location"}
        </button>

        {usesCurrentLocation ? (
          <p className="locationTimingResult">
            Your current drive is about {travelMinutes} minutes.
          </p>
        ) : (
          <>
            <label className="fieldLabel" htmlFor="travel-minutes">
              Or enter my drive time
            </label>

            <select
              id="travel-minutes"
              className="textInput"
              value={travelMinutes}
              onChange={(event) => {
                setTravelMinutes(Number(event.target.value));
                setUsesCurrentLocation(false);
              }}
            >
              {[5, 10, 15, 20, 25, 30, 35, 40, 45].map((minutes) => (
                <option key={minutes} value={minutes}>
                  About {minutes} minutes
                </option>
              ))}
            </select>
          </>
        )}

        {usesCurrentLocation ? (
          <button
            className="manualTimingButton"
            type="button"
            onClick={() => setUsesCurrentLocation(false)}
          >
            Enter drive time manually
          </button>
        ) : null}

        <label className="fieldLabel" htmlFor="cushion-minutes">
          I want to arrive before the bus by
        </label>

        <select
          id="cushion-minutes"
          className="textInput"
          value={cushionMinutes}
          onChange={(event) => setCushionMinutes(Number(event.target.value))}
        >
          {[0, 5, 10, 15].map((minutes) => (
            <option key={minutes} value={minutes}>
              {minutes === 0 ? "At the same time" : `${minutes} minutes early`}
            </option>
          ))}
        </select>

        {locationError ? (
          <p className="formError" role="alert">
            {locationError}
          </p>
        ) : null}

        <div className="preferenceActions">
          {preferences ? (
            <button
              className="cancelTimingButton"
              type="button"
              onClick={cancelEditing}
            >
              Cancel
            </button>
          ) : null}

          <button className="primaryButton" type="submit">
            Set my leave time
          </button>
        </div>
      </form>
    );
  }

  const elapsedSeconds =
    (currentTime - Date.parse(estimate.calculatedAt)) / 1000;

  const busArrivalSeconds = Math.max(
    0,
    estimate.durationSeconds - elapsedSeconds,
  );

  const leaveInSeconds = Math.ceil(
    busArrivalSeconds -
      (preferences!.travelMinutes + preferences!.cushionMinutes) * 60,
  );

  const shouldLeaveNow = leaveInSeconds <= 0;

  return (
    <>
      <section className="leaveHero">
        <p className="arrivalLabel">
          {shouldLeaveNow ? "It's time" : "Leave in"}
        </p>

        <p
          className={`leaveCountdown${
            shouldLeaveNow ? " leaveCountdownNow" : ""
          }`}
        >
          {shouldLeaveNow
            ? "Leave now"
            : `${Math.floor(leaveInSeconds / 60)}:${String(
                leaveInSeconds % 60,
              ).padStart(2, "0")}`}
        </p>

        <p className="tripDetail">
          {preferences!.travelMinutes} minute drive +{" "}
          {preferences!.cushionMinutes} minute cushion
        </p>
      </section>

      <PushAlertControl
        travelMinutes={preferences!.travelMinutes}
        cushionMinutes={preferences!.cushionMinutes}
      />

      <div className="timingLinks">
        <button
          className={`locationQuickButton${
            preferences!.usesCurrentLocation ? " locationQuickButtonActive" : ""
          }`}
          type="button"
          aria-label={
            preferences!.usesCurrentLocation
              ? "Location is on. Open location controls."
              : "Location is off. Open location controls."
          }
          onClick={() => {
            setLocationError("");
            setIsLocationPanelOpen(true);
          }}
        >
          <span
            className={`locationPin${
              preferences!.usesCurrentLocation ? " locationPinActive" : ""
            }`}
            aria-hidden="true"
          >
            <MapPin />
          </span>
          <span>
            Location {preferences!.usesCurrentLocation ? "on" : "off"}
          </span>
        </button>

        <button className="timingButton" type="button" onClick={startEditing}>
          <CalendarClock
            className="timingButtonSymbol"
            aria-hidden="true"
          />
          <span>Change timing</span>
          <span className="timingButtonArrow" aria-hidden="true">›</span>
        </button>
      </div>

      {isLocationPanelOpen ? (
        <section
          className="locationPanel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="location-panel-title"
        >
          <button
            className="panelCloseButton"
            type="button"
            aria-label="Close location controls"
            onClick={() => setIsLocationPanelOpen(false)}
          >
            <X />
          </button>

          <span
            className={`locationPanelPin${
              preferences!.usesCurrentLocation || isLocating
                ? " locationPanelPinActive"
                : ""
            }`}
            aria-hidden="true"
          >
            <MapPin />
          </span>

          <p className="panelKicker">Drive-time location</p>
          <h2 id="location-panel-title">
            Location {preferences!.usesCurrentLocation ? "is on" : "is off"}
          </h2>
          <p className="locationPanelCopy">
            {preferences!.usesCurrentLocation
              ? `Your drive is currently set to about ${preferences!.travelMinutes} minutes.`
              : "Turn it on to recalculate your drive from where you are now."}
          </p>

          {locationError ? (
            <p className="formError" role="alert">
              {locationError}
            </p>
          ) : null}

          <div className="locationPanelActions">
            <button
              className="primaryButton"
              type="button"
              disabled={isLocating}
              onClick={() => void enableOrResetCurrentLocation()}
            >
              {preferences!.usesCurrentLocation ? (
                <RefreshCw aria-hidden="true" />
              ) : (
                <MapPin aria-hidden="true" />
              )}
              {isLocating
                ? "Finding you…"
                : preferences!.usesCurrentLocation
                  ? "Reset location"
                  : "Turn location on"}
            </button>

            {preferences!.usesCurrentLocation ? (
              <button
                className="secondaryButton"
                type="button"
                onClick={disableCurrentLocation}
              >
                <Power aria-hidden="true" />
                Turn location off
              </button>
            ) : null}
          </div>

          <p className="locationPrivacyNote">
            Your location is used only to calculate your drive time. Parents
            never share a live location with the bus.
          </p>
        </section>
      ) : null}

      {locationError && !isLocationPanelOpen ? (
        <p className="leaveLocationError" role="alert">
          {locationError}
        </p>
      ) : null}
    </>
  );
}
