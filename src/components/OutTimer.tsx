
import { useState, useEffect } from "react";
import { calculateElapsedTime, formatElapsedTime, getElapsedMinutes } from "@/lib/timeUtils";

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

  // Calculate elapsed time using UTC timestamps
  const elapsedMs = calculateElapsedTime(timeOut);
  const elapsedMinutes = getElapsedMinutes(timeOut);

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
