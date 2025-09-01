import { useEffect, useState } from "react";

interface ConditionalVideoPlayerProps {
  destination: string;
  onComplete: () => void;
}

const ConditionalVideoPlayer = ({ destination, onComplete }: ConditionalVideoPlayerProps) => {
  const [selectedVideo, setSelectedVideo] = useState<string>("");

  const videoMap: Record<string, string[]> = {
    "Bathroom": [
      "https://jgicbewohdubulzdcuat.supabase.co/storage/v1/object/public/Videos/Bathroom%20Gnome1.mp4",
      "https://jgicbewohdubulzdcuat.supabase.co/storage/v1/object/public/Videos/Bathroom%20Rainbow%20Bridge1.mp4"
    ],
    "Locker": [
      "https://jgicbewohdubulzdcuat.supabase.co/storage/v1/object/public/Videos/Locker%20Room%20Rainbow%20Bridge1.mp4"
    ],
    "Counselor": [
      "https://jgicbewohdubulzdcuat.supabase.co/storage/v1/object/public/Videos/Counselor%20Rainbow%20Bridge1.mp4"
    ],
    "Dean of Students": [
      "https://jgicbewohdubulzdcuat.supabase.co/storage/v1/object/public/Videos/Dean%20of%20Students%20Rainbow%20Bridge1.mp4"
    ],
    "Dean of Academics": [
      "https://jgicbewohdubulzdcuat.supabase.co/storage/v1/object/public/Videos/Dean%20of%20Academics%20Rainbow%20Bridge1.mp4"
    ],
    "Nurse": [
      "https://jgicbewohdubulzdcuat.supabase.co/storage/v1/object/public/Videos/Nurse%20Rainbow%20Bridge1.mp4"
    ],
    "Football Meeting": [
      "https://jgicbewohdubulzdcuat.supabase.co/storage/v1/object/public/Videos/Football%20Meeting%20Rainbow%20Bridge1.mp4"
    ],
    "Other": [
      "https://jgicbewohdubulzdcuat.supabase.co/storage/v1/object/public/Videos/Other%20Rainbow%20Bridge1.mp4"
    ],
    "default": [
      "https://jgicbewohdubulzdcuat.supabase.co/storage/v1/object/public/Videos/TRex%20Origami.mp4"
    ]
  };

  useEffect(() => {
    const videoArray = videoMap[destination] || videoMap["default"];
    const randomIndex = Math.floor(Math.random() * videoArray.length);
    setSelectedVideo(videoArray[randomIndex]);
  }, [destination]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 7000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!selectedVideo) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <video
        src={selectedVideo}
        autoPlay
        muted
        loop
        className="w-full h-full object-cover"
        onError={(e) => {
          console.error("Video loading error:", e);
          // Fallback to default video if current video fails
          const defaultVideo = videoMap["default"][0];
          if (selectedVideo !== defaultVideo) {
            setSelectedVideo(defaultVideo);
          }
        }}
      />
    </div>
  );
};

export default ConditionalVideoPlayer;