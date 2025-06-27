
import { useState, useEffect } from "react";
import { getTorontoElapsedTime, formatElapsedTime } from "@/lib/supabaseDataManager";

interface OutTimerProps {
  timeOut: Date;
  className?: string;
}

const OutTimer = ({ timeOut, className = "" }: OutTimerProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getElapsedTime = () => {
    try {
      if (!timeOut || isNaN(timeOut.getTime())) {
        return 0;
      }
      return getTorontoElapsedTime(timeOut);
    } catch (error) {
      console.error("Error calculating elapsed time:", error);
      return 0;
    }
  };

  const elapsedMs = getElapsedTime();
  const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));

  const getColorClass = () => {
    if (elapsedMinutes > 10) return 'text-red-600';
    if (elapsedMinutes > 5) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className={`font-mono text-lg font-bold ${getColorClass()} ${className}`}>
      {formatElapsedTime(elapsedMs)}
    </div>
  );
};

export default OutTimer;
