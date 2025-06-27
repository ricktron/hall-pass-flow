
import { useState, useEffect } from "react";
import { formatElapsedTime } from "@/lib/timeUtils";

interface OutTimerProps {
  timeOut: Date | string;
  className?: string;
}

const OutTimer = ({ timeOut, className = "" }: OutTimerProps) => {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    // Add debugging
    console.log("OutTimer - Raw timeOut:", timeOut);
    console.log("OutTimer - timeOut type:", typeof timeOut);
    
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
        
        console.log("OutTimer - Parsed outTime:", outTime);
        console.log("OutTimer - outTime.getTime():", outTime.getTime());
        
        // Check if date is valid
        if (isNaN(outTime.getTime())) {
          console.warn("OutTimer - Invalid date:", timeOut);
          setElapsedMs(0);
          return;
        }
        
        const now = new Date();
        console.log("OutTimer - Current time:", now);
        console.log("OutTimer - now.getTime():", now.getTime());
        
        const elapsed = now.getTime() - outTime.getTime();
        console.log("OutTimer - Raw elapsed ms:", elapsed);
        
        // Ensure we never show negative time (could happen with timezone issues)
        const positiveElapsed = Math.max(0, elapsed);
        console.log("OutTimer - Final elapsed ms:", positiveElapsed);
        
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
