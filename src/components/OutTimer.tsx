
import { useState, useEffect } from "react";
import { formatElapsedTime, calculateElapsedTime } from "@/lib/timeUtils";

interface OutTimerProps {
  timeOut: Date | string;
  className?: string;
}

const OutTimer = ({ timeOut, className = "" }: OutTimerProps) => {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    console.log("OutTimer useEffect triggered with timeOut:", timeOut);
    
    const updateElapsed = () => {
      const now = new Date();
      const timeOutDate = new Date(timeOut);
      
      console.log("OutTimer updateElapsed called:", {
        timeOut,
        timeOutDate: timeOutDate.toISOString(),
        now: now.toISOString(),
        timeOutType: typeof timeOut,
        isValidTimeOut: !isNaN(timeOutDate.getTime()),
        isValidNow: !isNaN(now.getTime())
      });
      
      const elapsed = calculateElapsedTime(timeOut);
      console.log("OutTimer - Calculated elapsed:", elapsed, "ms");
      
      setElapsedMs(elapsed);
    };

    // Calculate immediately on mount
    console.log("OutTimer - Setting up initial calculation and interval");
    updateElapsed();

    // Set up interval to update every second
    const interval = setInterval(() => {
      console.log("OutTimer - Interval tick");
      updateElapsed();
    }, 1000);

    console.log("OutTimer - Interval set with ID:", interval);

    // Cleanup interval on unmount or when timeOut changes
    return () => {
      console.log("OutTimer - Cleaning up interval:", interval);
      clearInterval(interval);
    };
  }, [timeOut]);

  const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));

  const getColorClass = () => {
    if (elapsedMinutes >= 10) return 'text-red-600';
    if (elapsedMinutes >= 5) return 'text-yellow-600';
    return 'text-green-600';
  };

  console.log("OutTimer render:", {
    timeOut,
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
