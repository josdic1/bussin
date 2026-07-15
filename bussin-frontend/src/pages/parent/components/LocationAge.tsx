import { useEffect, useState } from "react";

type LocationAgeProps = {
  ageSeconds: number;
};

export function LocationAge({
  ageSeconds,
}: LocationAgeProps) {
  const [mountedAt] = useState(Date.now());
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1_000);

    return () => window.clearInterval(timer);
  }, []);

  const seconds = Math.max(
    0,
    Math.floor(
      ageSeconds + (currentTime - mountedAt) / 1000,
    ),
  );

  return (
    <p className="parentLocationAge">
      Updated{" "}
      {seconds === 0
        ? "just now"
        : `${seconds} ${seconds === 1 ? "second" : "seconds"} ago`}
    </p>
  );
}
