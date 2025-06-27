
import { useState, useEffect } from "react";
import { formatElapsedTime, calculateElapsedTime } from "@/lib/timeUtils";

interface OutTimerProps {
  timeOut: Date | string;
  className?: string;
}

const OutTimer = ({ timeOut, className = "" }: OutTimerProps) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    console.log("OutTimer mounted with timeOut:", timeOut);
    
    const updateTimer = () => {
      const seconds = calculateElapsedTime(timeOut);
      console.log("OutTimer update - elapsed seconds:", seconds);
      setElapsedSeconds(seconds);
    };

    // Calculate immediately
    updateTimer();

    // Set up interval to update every second
    const interval = setInterval(updateTimer, 1000);
    console.log("OutTimer interval started:", interval);

    return () => {
      console.log("OutTimer cleanup, clearing interval:", interval);
      clearInterval(interval);
    };
  }, [timeOut]);

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);

  const getColorClass = () => {
    if (elapsedMinutes >= 10) return 'text-red-600';
    if (elapsedMinutes >= 5) return 'text-yellow-600';
    return 'text-green-600';
  };

  console.log("OutTimer render:", {
    timeOut,
    elapsedSeconds,
    elapsedMinutes,
    formattedTime: formatElapsedTime(elapsedSeconds)
  });

  return (
    <div className={`font-mono text-lg font-bold ${getColorClass()} ${className}`}>
      {formatElapsedTime(elapsedSeconds)}
    </div>
  );
};

export default OutTimer;
