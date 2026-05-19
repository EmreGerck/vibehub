'use client';

import { useRef, useState, useEffect } from 'react';

interface GifPlayerProps {
  src: string;
  alt: string;
  className?: string;
  poster?: string;
  /** Controlled hover state (passed by parent). When omitted, component manages its own state. */
  isHovering?: boolean;
  objectPosition?: string;
}

const isVideoUrl = (url: string) => /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);

export default function GifPlayer({
  src,
  alt,
  className = '',
  poster,
  isHovering,
  objectPosition = '50% 50%',
}: GifPlayerProps) {
  const [internalHover, setInternalHover] = useState(false);
  const active = isHovering !== undefined ? isHovering : internalHover;

  // Incremented each time hover starts — forces the GIF <img> to remount
  // so the animation restarts from frame 0 on every hover.
  const [gifKey, setGifKey] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo = isVideoUrl(src);

  // Track the previous active state so we only increment gifKey on the
  // false→true transition (hover start), not on every render.
  const prevActiveRef = useRef(false);

  useEffect(() => {
    const wasActive = prevActiveRef.current;
    prevActiveRef.current = active;

    if (isVideo) {
      const v = videoRef.current;
      if (!v) return;
      if (active) {
        v.currentTime = 0;
        v.play().catch(() => {});
      } else {
        v.pause();
        v.currentTime = 0;
      }
    } else {
      // GIF: remount the element on hover start so animation resets to frame 0
      if (active && !wasActive) {
        setGifKey((k) => k + 1);
      }
    }
  }, [active, isVideo]);

  const handlers =
    isHovering !== undefined
      ? {}
      : {
          onMouseEnter: () => setInternalHover(true),
          onMouseLeave: () => setInternalHover(false),
        };

  return (
    <div className={`relative overflow-hidden ${className}`} {...handlers}>
      {/* Poster — shown when not hovering */}
      {poster && (
        <img
          src={poster}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 pointer-events-none"
          style={{ objectPosition, opacity: active ? 0 : 1 }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      )}

      {isVideo ? (
        <video
          ref={videoRef}
          src={src}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 pointer-events-none"
          style={{ objectPosition, opacity: active ? 1 : 0 }}
          muted
          playsInline
          preload="auto"
          // No `loop` — plays once then holds on last frame. Restarts on next hover.
        />
      ) : (
        /*
         * GIF: key changes on each hover start, forcing React to unmount/remount
         * the element. The browser re-starts the GIF animation from frame 0.
         * The cached GIF is reused (no extra network request).
         */
        <img
          key={gifKey}
          src={src}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-200 pointer-events-none"
          style={{ objectPosition, opacity: active ? 1 : 0 }}
        />
      )}
    </div>
  );
}
