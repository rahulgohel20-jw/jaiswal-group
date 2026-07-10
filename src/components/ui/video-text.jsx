'use client';

import * as React from 'react';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * VideoText displays content with a background video fill effect.
 * The video is masked by the content, creating a dynamic animated text look.
 */
export function VideoText({
  src,
  children,
  className = '',
  autoPlay = true,
  muted = true,
  loop = true,
  preload = 'auto',
  fontSize = '20vw',
  fontWeight = 'bold',
  as: Component = 'div',
  onPlay,
  onPause,
  onEnded,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const textRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const textElement = textRef.current;
    const container = containerRef.current;

    if (!video || !canvas || !textElement || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId;

    const updateCanvas = () => {
      // Get text dimensions first
      const text = textElement.textContent || '';
      ctx.font = `${fontWeight} ${typeof fontSize === 'number' ? `${fontSize}px` : fontSize} system-ui, -apple-system, sans-serif`;
      const textMetrics = ctx.measureText(text);
      const textWidth = textMetrics.width;
      const textHeight =
        typeof fontSize === 'number'
          ? fontSize
          : parseFloat(fontSize.replace(/[^\d.]/g, '')) || 100;

      // Set canvas size to accommodate full text with padding
      const padding = 40;
      canvas.width = Math.max(textWidth + padding * 2, 400);
      canvas.height = Math.max(textHeight + padding * 2, 200);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw video frame to fill canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Set up text masking
      ctx.globalCompositeOperation = 'destination-in';

      // Draw text as mask
      ctx.fillStyle = 'white';
      ctx.font = `${fontWeight} ${typeof fontSize === 'number' ? `${fontSize}px` : fontSize} system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.fillText(text, canvas.width / 2, canvas.height / 2);

      // Reset composite operation
      ctx.globalCompositeOperation = 'source-over';

      animationId = requestAnimationFrame(updateCanvas);
    };

    const handleVideoLoad = () => {
      updateCanvas();
    };

    const handleResize = () => {
      updateCanvas();
    };

    video.addEventListener('loadeddata', handleVideoLoad);
    video.addEventListener('play', updateCanvas);
    window.addEventListener('resize', handleResize);

    return () => {
      video.removeEventListener('loadeddata', handleVideoLoad);
      video.removeEventListener('play', updateCanvas);
      window.removeEventListener('resize', handleResize);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [fontSize, fontWeight]);

  const sources = Array.isArray(src) ? src : [src];
  const content = React.Children.toArray(children).join('');

  return (
    <Component
      ref={containerRef}
      className={cn('relative inline-block overflow-hidden', className)}
    >
      {/* Hidden video element */}
      <video
        ref={videoRef}
        className="absolute opacity-0 pointer-events-none"
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        preload={preload}
        playsInline
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEnded}
        crossOrigin="anonymous"
      >
        {sources.map((source, index) => (
          <source key={index} src={source} />
        ))}
        Your browser does not support the video tag.
      </video>

      {/* Canvas that shows the masked video */}
      <canvas
        ref={canvasRef}
        className="block"
        style={{
          width: '100%',
          height: 'auto',
        }}
      />

      {/* Hidden text for measuring and accessibility */}
      <div
        ref={textRef}
        className="absolute opacity-0 pointer-events-none font-bold"
        style={{
          fontSize: typeof fontSize === 'number' ? `${fontSize}px` : fontSize,
          fontWeight,
        }}
        aria-label={content}
      >
        {children}
      </div>

      {/* Screen reader text */}
      <span className="sr-only">{content}</span>
    </Component>
  );
}
