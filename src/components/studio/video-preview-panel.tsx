"use client";

import { useEffect, useRef, useState } from "react";
import { useStudioStore } from "@/lib/studio/store";
import { Button } from "@/components/ui/button";
import { Pause, Play } from "lucide-react";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

function VideoScrubber({ url }: { url: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onLoadedMetadata = () => setDuration(video.duration);
    const onEnded = () => setIsPlaying(false);

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("ended", onEnded);
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("ended", onEnded);
    };
  }, []);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }

  function handleSeek(event: React.ChangeEvent<HTMLInputElement>) {
    const video = videoRef.current;
    if (!video) return;
    const time = Number(event.target.value);
    video.currentTime = time;
    setCurrentTime(time);
  }

  return (
    <div className="flex w-56 shrink-0 flex-col gap-2 rounded-md border border-border p-2">
      <video ref={videoRef} src={url} className="w-full rounded bg-black" playsInline />
      <div className="flex items-center gap-2">
        <Button type="button" size="icon-xs" variant="outline" onClick={togglePlay}>
          {isPlaying ? <Pause /> : <Play />}
        </Button>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.01}
          value={currentTime}
          onChange={handleSeek}
          className="h-1.5 flex-1 accent-primary"
          aria-label="Seek"
        />
        <span className="w-16 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}

export function VideoPreviewPanel() {
  const videos = useStudioStore((s) => s.videos);
  if (videos.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto border-t border-border p-3">
      {videos.map((video) => (
        <VideoScrubber key={video.id} url={video.url} />
      ))}
    </div>
  );
}
