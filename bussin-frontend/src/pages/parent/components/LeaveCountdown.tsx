import {
  CalendarClock,
  MapPin,
  Power,
  RefreshCw,
  Timer,
  X,
} from "lucide-react";
import type { ArrivalEstimate } from "@bussin/shared";
import { type FormEvent, useEffect, useState } from "react";
import { appConfig } from "../../../config";
import { PushAlertControl } from "./PushAlertControl";

const STORAGE_KEY = "bussin.parentLeavePreferences";
const TIMING_CONFIRMED_STORAGE_KEY = "bussin.parentTimingConfirmed";
const PARENT_CODE_STORAGE_KEY = "bussin.parentAccessCode";

type LeavePreferences = {
  travelMinutes: number;
  cushionMinutes: number;
  usesCurrentLocation: boolean;
};

const DEFAULT_PREFERENCES: LeavePreferences = {
  travelMinutes: 15,
  cushionMinutes: 5,
  usesCurrentLocation: false,
};

type LeaveCountdownProps = {
  estimate?: ArrivalEstimate | null;
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
  const [preferences, setPreferences] = useState<LeavePreferences>(
    () => loadPreferences() ?? DEFAULT_PREFERENCES,
  );
  const [isEditing, setIsEditing] = useState(false);
  const [travelMinutes, setTravelMinutes] = useState(
    preferences.travelMinutes,
  );
  const [cushionMinutes, setCushionMinutes] = useState(
    preferences.cushionMinutes,
  );
  const [usesCurrentLocation, setUsesCurrentLocation] = useState(
    preferences.usesCurrentLocation,
  );
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [isLocationPanelOpen, setIsLocationPanelOpen] = useState(false);
  const [isTimingConfirmed, setIsTimingConfirmed] = useState(
    () => localStorage.getItem(TIMING_CONFIRMED_STORAGE_KEY) === "true",
  );

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
      cushionMinutes: preferences.cushionMinutes,
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
      travelMinutes: preferences.travelMinutes,
      cushionMinutes: preferences.cushionMinutes,
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
    localStorage.setItem(TIMING_CONFIRMED_STORAGE_KEY, "true");

    setPreferences(nextPreferences);
    setIsTimingConfirmed(true);
    setIsEditing(false);
  }

  function useFiveMinuteHeadsUp() {
    const nextPreferences = {
      ...preferences,
      cushionMinutes: 5,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPreferences));
    localStorage.setItem(TIMING_CONFIRMED_STORAGE_KEY, "true");
    setPreferences(nextPreferences);
    setCushionMinutes(5);
    setIsTimingConfirmed(true);
  }

  function startEditing() {
    setTravelMinutes(preferences.travelMinutes);
    setCushionMinutes(preferences.cushionMinutes);
    setUsesCurrentLocation(preferences.usesCurrentLocation);
    setLocationError("");
    setIsEditing(true);
  }

  function cancelEditing() {
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
          <button
            className="cancelTimingButton"
            type="button"
            onClick={cancelEditing}
          >
            Cancel
          </button>

          <button className="primaryButton" type="submit">
            Set my leave time
          </button>
        </div>
      </form>
    );
  }

  const savedPreferences = preferences;

  const preferenceControls = (
    <>
      <PushAlertControl
        travelMinutes={savedPreferences.travelMinutes}
        cushionMinutes={savedPreferences.cushionMinutes}
      />

      <div className="timingLinks">
        <button
          className={`locationQuickButton${
            savedPreferences.usesCurrentLocation
              ? " locationQuickButtonActive"
              : ""
          }`}
          type="button"
          aria-label={
            savedPreferences.usesCurrentLocation
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
              savedPreferences.usesCurrentLocation ? " locationPinActive" : ""
            }`}
            aria-hidden="true"
          >
            <MapPin />
          </span>
          <span>
            Location {savedPreferences.usesCurrentLocation ? "on" : "off"}
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
              savedPreferences.usesCurrentLocation || isLocating
                ? " locationPanelPinActive"
                : ""
            }`}
            aria-hidden="true"
          >
            <MapPin />
          </span>

          <p className="panelKicker">Drive-time location</p>
          <h2 id="location-panel-title">
            Location {savedPreferences.usesCurrentLocation ? "is on" : "is off"}
          </h2>
          <p className="locationPanelCopy">
            {savedPreferences.usesCurrentLocation
              ? `Your drive is currently set to about ${savedPreferences.travelMinutes} minutes.`
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
              {savedPreferences.usesCurrentLocation ? (
                <RefreshCw aria-hidden="true" />
              ) : (
                <MapPin aria-hidden="true" />
              )}
              {isLocating
                ? "Finding you…"
                : savedPreferences.usesCurrentLocation
                  ? "Reset location"
                  : "Turn location on"}
            </button>

            {savedPreferences.usesCurrentLocation ? (
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

  if (!estimate) {
    return (
      <section className="parentQuickSetup" aria-label="Parent alert setup">
        <header className="parentQuickSetupHeader">
          <p className="panelKicker">Before the bus starts</p>
          <h2>Get ready</h2>
          <p>Tap what you want Bussin to use.</p>
        </header>

        <div className="parentQuickSetupChoices">
          <button
            className={`parentQuickSetupAction${
              savedPreferences.usesCurrentLocation
                ? " parentQuickSetupActionActive"
                : ""
            }`}
            type="button"
            disabled={isLocating}
            aria-pressed={savedPreferences.usesCurrentLocation}
            onClick={() => void enableOrResetCurrentLocation()}
          >
            <span className="parentQuickSetupIcon" aria-hidden="true">
              <MapPin />
            </span>
            <strong>
              {savedPreferences.usesCurrentLocation
                ? "Location on"
                : "Get my location"}
            </strong>
            <small>
              {isLocating
                ? "Finding you…"
                : savedPreferences.usesCurrentLocation
                  ? `${savedPreferences.travelMinutes} min drive`
                  : "Tap the pin"}
            </small>
          </button>

          <button
            className={`parentQuickSetupAction${
              isTimingConfirmed ? " parentQuickSetupActionActive" : ""
            }`}
            type="button"
            aria-pressed={isTimingConfirmed}
            onClick={useFiveMinuteHeadsUp}
          >
            <span className="parentQuickSetupIcon" aria-hidden="true">
              <Timer />
            </span>
            <strong>5 min heads-up</strong>
            <small>{isTimingConfirmed ? "Timing set" : "Tap the timer"}</small>
          </button>

          <PushAlertControl
            travelMinutes={savedPreferences.travelMinutes}
            cushionMinutes={savedPreferences.cushionMinutes}
            variant="quickSetup"
          />
        </div>

        <div className="parentQuickSetupManual">
          <span>Or</span>
          <button type="button" onClick={startEditing}>
            I’ll type it myself <b aria-hidden="true">›</b>
          </button>
        </div>

        {locationError ? (
          <p className="parentQuickSetupError" role="alert">
            {locationError}
          </p>
        ) : null}
      </section>
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
      (savedPreferences.travelMinutes + savedPreferences.cushionMinutes) * 60,
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
          {savedPreferences.travelMinutes} minute drive +{" "}
          {savedPreferences.cushionMinutes} minute cushion
        </p>
      </section>

      {preferenceControls}
    </>
  );
}
