
import { useState, useEffect } from "react";
import { formatElapsedTime, calculateElapsedTime } from "@/lib/timeUtils";

interface OutTimerProps {
  timeOut: Date | string;
  className?: string;
}

const OutTimer = ({ timeOut, className = "" }: OutTimerProps) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const updateTimer = () => {
      const seconds = calculateElapsedTime(timeOut);
      setElapsedSeconds(seconds);
    };

    // Calculate immediately
    updateTimer();

    // Set up interval to update every second
    const interval = setInterval(updateTimer, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [timeOut]);

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);

  const getColorClass = () => {
    if (elapsedMinutes >= 10) return 'text-red-600';
    if (elapsedMinutes >= 5) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className={`font-mono font-bold ${getColorClass()} ${className}`}>
      {formatElapsedTime(elapsedSeconds)}
    </div>
  );
};

export default OutTimer;
