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
      <p className="arrivalLabel">Bus arrives in</p>

      <p className="arrivalCountdown">
        {minutes}:{String(seconds).padStart(2, "0")}
      </p>

      <p className="tripDetail">Live estimate to JCC MetroWest</p>
    </section>
  );
}
