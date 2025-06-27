
import { useState, useEffect } from "react";
import { calculateElapsedTime, formatElapsedTime, getElapsedMinutes } from "@/lib/timeUtils";

interface OutTimerProps {
  timeOut: Date;
  className?: string;
}

const OutTimer = ({ timeOut, className = "" }: OutTimerProps) => {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    // Add debugging
    console.log("OutTimer - Raw timeOut:", timeOut);
    console.log("OutTimer - timeOut type:", typeof timeOut);
    console.log("OutTimer - timeOut as Date:", new Date(timeOut));
    
    const calculateAndSetElapsed = () => {
      const outTime = new Date(timeOut);
      const now = new Date();
      const elapsed = now.getTime() - outTime.getTime();
      console.log("OutTimer - Calculated elapsed ms:", elapsed);
      setElapsedMs(Math.max(0, elapsed));
    };

    // Calculate immediately
    calculateAndSetElapsed();

    // Then update every second
    const interval = setInterval(calculateAndSetElapsed, 1000);
    
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
