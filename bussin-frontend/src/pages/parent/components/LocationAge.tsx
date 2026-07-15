import { useEffect, useState } from "react";

type LocationAgeProps = {
  ageSeconds: number;
};

export function LocationAge({
  ageSeconds,
}: LocationAgeProps) {
  const [seconds, setSeconds] = useState(
    Math.max(0, Math.floor(ageSeconds)),
  );

  useEffect(() => {
    setSeconds(Math.max(0, Math.floor(ageSeconds)));

    const timer = window.setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1_000);

    return () => window.clearInterval(timer);
  }, [ageSeconds]);

  return (
    <p className="parentLocationAge">
      Updated{" "}
      {seconds === 0
        ? "just now"
        : `${seconds} ${
            seconds === 1 ? "second" : "seconds"
          } ago`}
    </p>
  );
}
