import { useEffect, useState } from "react";

export function CurrentTime() {
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1_000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <time
      className="currentTime"
      dateTime={new Date(currentTime).toISOString()}
    >
      {new Date(currentTime).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      })}
    </time>
  );
}
