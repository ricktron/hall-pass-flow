
import { useState, useEffect } from "react";

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
      return Math.abs(currentTime.getTime() - timeOut.getTime());
    } catch (error) {
      console.error("Error calculating elapsed time:", error);
      return 0;
    }
  };

  const formatElapsedTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(Math.abs(milliseconds) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const elapsedMs = getElapsedTime();
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
