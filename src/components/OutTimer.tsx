
import { useState, useEffect } from "react";
import { formatElapsedTime, calculateElapsedTime } from "@/lib/timeUtils";

interface OutTimerProps {
  timeOut: Date | string;
  className?: string;
}

const OutTimer = ({ timeOut, className = "" }: OutTimerProps) => {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const updateElapsed = () => {
      const elapsed = calculateElapsedTime(timeOut);
      setElapsedMs(elapsed);
    };

    // Calculate immediately
    updateElapsed();

    // Set up interval to update every second
    const interval = setInterval(updateElapsed, 1000);

    // Cleanup interval on unmount or when timeOut changes
    return () => clearInterval(interval);
  }, [timeOut]); // Include timeOut in dependency array so timer resets when it changes

  const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));

  const getColorClass = () => {
    if (elapsedMinutes >= 10) return 'text-red-600';
    if (elapsedMinutes >= 5) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className={`font-mono text-lg font-bold ${getColorClass()} ${className}`}>
      {formatElapsedTime(elapsedMs)}
    </div>
  );
};

export default OutTimer;
