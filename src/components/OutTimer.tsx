
import { useState, useEffect } from "react";
import { formatElapsedTime, calculateElapsedTime } from "@/lib/timeUtils";

interface OutTimerProps {
  timeOut: Date | string;
  className?: string;
}

const OutTimer = ({ timeOut, className = "" }: OutTimerProps) => {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    // Ensure we have a valid timeOut value
    if (!timeOut) {
      console.warn("OutTimer - No timeOut provided");
      return;
    }
    
    const calculateAndUpdateElapsed = () => {
      try {
        const elapsed = calculateElapsedTime(timeOut);
        setElapsedMs(elapsed);
      } catch (error) {
        console.error("OutTimer - Error calculating elapsed time:", error);
        setElapsedMs(0);
      }
    };

    // Calculate immediately
    calculateAndUpdateElapsed();

    // Then update every second
    const interval = setInterval(calculateAndUpdateElapsed, 1000);
    
    return () => clearInterval(interval);
  }, [timeOut]);

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
