import { parentTripViewSchema, type ParentTripView } from "@bussin/shared";
import { useEffect, useState } from "react";
import { appConfig } from "../../../config";
import { ArrivalCountdown } from "./ArrivalCountdown";
import { BusMap } from "./BusMap";
import { LeaveCountdown } from "./LeaveCountdown";
import { LocationAge } from "./LocationAge";

const PARENT_CODE_STORAGE_KEY = "bussin.parentAccessCode";
const REFRESH_INTERVAL_MILLISECONDS = 5_000;

function formatMessageTime(sentAt?: string | null) {
  if (!sentAt) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(sentAt));
}

function DriverMessage({
  message,
  sentAt,
}: {
  message?: string | null;
  sentAt?: string | null;
}) {
  const formattedTime = formatMessageTime(sentAt);

  return (
    <aside className="parentDriverMessage">
      <span className="driverMessageIcon" aria-hidden="true">
        <img src="/icon-message.svg" alt="" />
      </span>

      <div className="driverMessageCopy">
        <div className="driverMessageMeta">
          <span>Latest driver message</span>
          {formattedTime && sentAt ? (
            <time dateTime={sentAt}>
              {formattedTime}
            </time>
          ) : null}
        </div>
        <strong>{message || "No new message from the driver."}</strong>
      </div>
    </aside>
  );
}

export function ParentTripStatus() {
  const [trip, setTrip] = useState<ParentTripView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadTrip() {
      const parentCode = localStorage.getItem(PARENT_CODE_STORAGE_KEY);

      if (!parentCode) {
        throw new Error("Parent access code is missing.");
      }

      const response = await fetch(`${appConfig.apiUrl}/api/parent/trip`, {
        headers: {
          "x-parent-code": parentCode,
        },
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(body?.error ?? "Could not load the current trip.");
      }

      return parentTripViewSchema.parse(body);
    }

    function refreshTrip() {
      loadTrip()
        .then((nextTrip) => {
          if (!isActive) {
            return;
          }

          setTrip(nextTrip);
          setError("");
        })
        .catch((caughtError) => {
          if (!isActive) {
            return;
          }

          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Could not load the current trip.",
          );
        })
        .finally(() => {
          if (isActive) {
            setIsLoading(false);
          }
        });
    }

    refreshTrip();

    const refreshTimer = window.setInterval(
      refreshTrip,
      REFRESH_INTERVAL_MILLISECONDS,
    );

    return () => {
      isActive = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  if (isLoading) {
    return (
      <section className="tripControls parentDashboard parentDashboardState">
        <DriverMessage
          message={trip?.driverMessage}
          sentAt={trip?.driverMessageUpdatedAt}
        />
        <p className="tripStatus">Loading trip status…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="tripControls parentDashboard parentDashboardState">
        <DriverMessage
          message={trip?.driverMessage}
          sentAt={trip?.driverMessageUpdatedAt}
        />
        <p className="formError" role="alert">
          {error}
        </p>
      </section>
    );
  }

  if (trip?.status === "NOT_SHARING") {
    return (
      <section className="tripControls parentDashboard parentDashboardState">
        <DriverMessage
          message={trip?.driverMessage}
          sentAt={trip?.driverMessageUpdatedAt}
        />
        <p className="tripStatus">
          Status: <strong>Bus location is not being shared</strong>
        </p>
      </section>
    );
  }

  if (trip?.status === "STALE") {
    return (
      <section className="tripControls parentDashboard parentDashboardState">
        <DriverMessage
          message={trip?.driverMessage}
          sentAt={trip?.driverMessageUpdatedAt}
        />
        <p className="tripStatus">
          Status: <strong>Location signal is stale</strong>
        </p>
        <p className="tripDetail">
          The driver is sharing, but the latest location is old.
        </p>

        {trip.location ? (
          <div className="staleLocationAge">
            <LocationAge ageSeconds={trip.location.ageSeconds} />
          </div>
        ) : null}

        {trip.location ? (
          <BusMap
            latitude={trip.location.latitude}
            longitude={trip.location.longitude}

            destination={trip.arrivalEstimate?.destination}

            route={trip.arrivalEstimate?.route}

            routeCalculatedAt={trip.arrivalEstimate?.calculatedAt}
            isStale
          />
        ) : null}
      </section>
    );
  }

  return (
    <section className="tripControls parentDashboard">
      <DriverMessage
        message={trip?.driverMessage}
        sentAt={trip?.driverMessageUpdatedAt}
      />
      <p className="tripStatus">
        Status: <strong>Bus trip is active</strong>
      </p>
      <p className="tripDetail">
        {trip?.location
          ? "Receiving the bus location."
          : "Waiting for the first location update."}
      </p>

      {trip?.location ? (
        <LocationAge ageSeconds={trip.location.ageSeconds} />
      ) : null}

      {trip?.arrivalEstimate ? (
        <>
          <ArrivalCountdown estimate={trip.arrivalEstimate} />
          <LeaveCountdown estimate={trip.arrivalEstimate} />
        </>
      ) : null}

      {trip?.location ? (
        <BusMap
          latitude={trip.location.latitude}
          longitude={trip.location.longitude}

          destination={trip.arrivalEstimate?.destination}

          route={trip.arrivalEstimate?.route}

          routeCalculatedAt={trip.arrivalEstimate?.calculatedAt}
          isStale={false}
        />
      ) : null}
    </section>
  );
}
