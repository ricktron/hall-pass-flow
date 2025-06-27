
import { useState, useEffect, useRef } from "react";
import { formatElapsedTime, calculateElapsedTime } from "@/lib/timeUtils";

interface OutTimerProps {
  timeOut: Date | string;
  className?: string;
}

const OutTimer = ({ timeOut, className = "" }: OutTimerProps) => {
  const [elapsedMs, setElapsedMs] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const timeOutRef = useRef(timeOut);

  // Update timeOut ref when prop changes
  useEffect(() => {
    timeOutRef.current = timeOut;
  }, [timeOut]);

  useEffect(() => {
    mountedRef.current = true;
    
    const updateElapsed = () => {
      if (!mountedRef.current) return;
      
      try {
        const elapsed = calculateElapsedTime(timeOutRef.current);
        setElapsedMs(elapsed);
      } catch (error) {
        console.error("OutTimer - Error calculating elapsed time:", error);
      }
    };

    // Calculate immediately
    updateElapsed();

    // Set up interval - only create if we don't have one
    if (!intervalRef.current) {
      intervalRef.current = setInterval(updateElapsed, 1000);
    }

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []); // Empty dependency array - we handle timeOut changes via ref

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
