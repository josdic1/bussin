import type { ArrivalEstimate } from "@bussin/shared";
import { useEffect, useState } from "react";

type ArrivalCountdownProps = {
  estimate: ArrivalEstimate;
};

export function ArrivalCountdown({
  estimate,
}: ArrivalCountdownProps) {
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const elapsedSeconds =
    (currentTime - Date.parse(estimate.calculatedAt)) / 1000;

  const remainingSeconds = Math.max(
    0,
    Math.ceil(
      estimate.durationSeconds - elapsedSeconds,
    ),
  );

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return (
    <section className="arrivalPanel">
      <div className="arrivalIconColumn" aria-hidden="true">
        <img src="/icon-clock.svg" alt="" />
      </div>

      <div className="arrivalCopy">
        <p className="arrivalLabel">Bus arrives in</p>

        <p className="arrivalCountdown">
          {minutes}:{String(seconds).padStart(2, "0")}
        </p>
      </div>

      <div className="arrivalBusColumn" aria-hidden="true">
        <img src="/icon-bus-red.svg" alt="" />
      </div>

      <p className="arrivalTripDetail">
        Live estimate to JCC MetroWest
      </p>
    </section>
  );
}
