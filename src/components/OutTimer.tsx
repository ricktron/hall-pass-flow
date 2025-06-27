
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

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Ensure we have a valid timeOut value
    if (!timeOut) {
      console.warn("OutTimer - No timeOut provided");
      setElapsedMs(0);
      return;
    }
    
    const calculateAndUpdateElapsed = () => {
      if (!mountedRef.current) return;
      
      try {
        const elapsed = calculateElapsedTime(timeOut);
        setElapsedMs(elapsed);
      } catch (error) {
        console.error("OutTimer - Error calculating elapsed time:", error);
        if (mountedRef.current) {
          setElapsedMs(0);
        }
      }
    };

    // Calculate immediately
    calculateAndUpdateElapsed();

    // Then update every second with a unique interval for this instance
    intervalRef.current = setInterval(calculateAndUpdateElapsed, 1000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
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
