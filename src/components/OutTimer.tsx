
import { useState, useEffect } from "react";
import { formatElapsedTime } from "@/lib/timeUtils";

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
    
    const calculateAndSetElapsed = () => {
      try {
        // Convert timeOut to Date, handling both string and Date inputs
        let outTime: Date;
        if (typeof timeOut === 'string') {
          outTime = new Date(timeOut);
        } else {
          outTime = new Date(timeOut);
        }
        
        // Check if date is valid
        if (isNaN(outTime.getTime())) {
          console.warn("OutTimer - Invalid date:", timeOut);
          setElapsedMs(0);
          return;
        }
        
        const now = new Date();
        const elapsed = now.getTime() - outTime.getTime();
        
        // For debugging timezone issues
        if (elapsed < 0) {
          console.warn("OutTimer - Negative elapsed time, likely timezone issue:", {
            timeOut: timeOut,
            outTime: outTime.toISOString(),
            now: now.toISOString(),
            elapsed: elapsed
          });
          
          // Try treating the timeOut as if it's already in local time
          const localOutTime = new Date(outTime.getTime() - (outTime.getTimezoneOffset() * 60000));
          const adjustedElapsed = now.getTime() - localOutTime.getTime();
          
          if (adjustedElapsed >= 0) {
            setElapsedMs(adjustedElapsed);
            return;
          }
        }
        
        // Ensure we never show negative time
        const positiveElapsed = Math.max(0, elapsed);
        setElapsedMs(positiveElapsed);
      } catch (error) {
        console.error("OutTimer - Error calculating elapsed time:", error);
        setElapsedMs(0);
      }
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
