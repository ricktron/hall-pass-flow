
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
      const now = new Date();
      const timeOutDate = new Date(timeOut);
      
      console.log("OutTimer Debug:", {
        timeOut,
        timeOutDate,
        now,
        timeOutType: typeof timeOut,
        isValidTimeOut: !isNaN(timeOutDate.getTime()),
        isValidNow: !isNaN(now.getTime())
      });
      
      const elapsed = calculateElapsedTime(timeOut);
      console.log("Calculated elapsed:", elapsed, "ms");
      
      setElapsedMs(elapsed);
    };

    // Calculate immediately
    updateElapsed();

    // Set up interval to update every second
    const interval = setInterval(updateElapsed, 1000);

    // Cleanup interval on unmount or when timeOut changes
    return () => clearInterval(interval);
  }, [timeOut]);

  const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));

  const getColorClass = () => {
    if (elapsedMinutes >= 10) return 'text-red-600';
    if (elapsedMinutes >= 5) return 'text-yellow-600';
    return 'text-green-600';
  };

  console.log("OutTimer render:", {
    elapsedMs,
    elapsedMinutes,
    formattedTime: formatElapsedTime(elapsedMs)
  });

  return (
    <div className={`font-mono text-lg font-bold ${getColorClass()} ${className}`}>
      {formatElapsedTime(elapsedMs)}
    </div>
  );
};

export default OutTimer;
