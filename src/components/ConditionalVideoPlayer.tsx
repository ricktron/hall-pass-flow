import { useEffect, useState, useRef } from "react";

interface ConditionalVideoPlayerProps {
  destination: string;
  onComplete: () => void;
}

const ConditionalVideoPlayer = ({ destination, onComplete }: ConditionalVideoPlayerProps) => {
  const [selectedVideo, setSelectedVideo] = useState<string>("");
  const [hasError, setHasError] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const videoMap: Record<string, string[]> = {
    "Bathroom": [
      "https://jgicbewohdubulzdcuat.supabase.co/storage/v1/object/public/videos/Bathroom%20Gnome1.mp4",
      "https://jgicbewohdubulzdcuat.supabase.co/storage/v1/object/public/videos/Bathroom%20Rainbow%20Bridge1.mp4"
    ],
    "Locker": [
      "https://jgicbewohdubulzdcuat.supabase.co/storage/v1/object/public/videos/Locker%20Room%20Rainbow%20Bridge1.mp4"
    ],
    "Counselor": [
      "https://jgicbewohdubulzdcuat.supabase.co/storage/v1/object/public/videos/Counselor%20Rainbow%20Bridge1.mp4"
    ],
    "Dean of Students": [
      "https://jgicbewohdubulzdcuat.supabase.co/storage/v1/object/public/videos/Dean%20of%20Students%20Rainbow%20Bridge1.mp4"
    ],
    "Dean of Academics": [
      "https://jgicbewohdubulzdcuat.supabase.co/storage/v1/object/public/videos/Dean%20of%20Academics%20Rainbow%20Bridge1.mp4"
    ],
    "Nurse": [
      "https://jgicbewohdubulzdcuat.supabase.co/storage/v1/object/public/videos/Nurse%20Rainbow%20Bridge1.mp4"
    ],
    "Football Meeting": [
      "https://jgicbewohdubulzdcuat.supabase.co/storage/v1/object/public/videos/Football%20Meeting%20Rainbow%20Bridge1.mp4"
    ],
    "Other": [
      "https://jgicbewohdubulzdcuat.supabase.co/storage/v1/object/public/videos/Other%20Rainbow%20Bridge1.mp4"
    ],
    "default": [
      "https://jgicbewohdubulzdcuat.supabase.co/storage/v1/object/public/videos/TRex%20Origami.mp4"
    ]
  };

  useEffect(() => {
    // Only show videos for Bathroom destination
    if (destination !== "Bathroom") {
      onComplete();
      return;
    }
    
    const videoArray = videoMap[destination];
    if (!videoArray || videoArray.length === 0) {
      // No videos available for this destination, complete immediately
      onComplete();
      return;
    }
    
    const randomIndex = Math.floor(Math.random() * videoArray.length);
    const selectedVideoUrl = videoArray[randomIndex];
    
    if (!selectedVideoUrl) {
      // Invalid video URL, complete immediately
      onComplete();
      return;
    }
    
    setSelectedVideo(selectedVideoUrl);
    
    // Safety timeout in case video doesn't load or play
    timeoutRef.current = setTimeout(() => {
      console.warn('Video timeout, completing video player');
      onComplete();
    }, 30000); // 30 second timeout
    
    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [destination, onComplete]);


  const handleVideoError = () => {
    console.error("Video loading error for:", selectedVideo);
    setHasError(true);
    
    // Try fallback to default video if not already using it
    const defaultVideo = videoMap["default"]?.[0];
    if (defaultVideo && selectedVideo !== defaultVideo && !hasError) {
      console.log("Trying fallback video:", defaultVideo);
      setSelectedVideo(defaultVideo);
      return;
    }
    
    // If default video also fails or we're already in error state, complete
    onComplete();
  };

  const handleVideoEnded = () => {
    // Clear timeout since video completed successfully
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    onComplete();
  };

  // Don't render if no video selected
  if (!selectedVideo) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <video
        src={selectedVideo}
        autoPlay
        muted
        className="w-full h-full object-cover"
        onEnded={handleVideoEnded}
        onError={handleVideoError}
        onLoadStart={() => {
          console.log("Video loading started:", selectedVideo);
        }}
        onCanPlay={() => {
          console.log("Video can play:", selectedVideo);
          setHasError(false); // Reset error state when video loads successfully
        }}
      />
      {hasError && (
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <div className="text-white text-center">
            <p className="text-xl mb-4">Loading video...</p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConditionalVideoPlayer;