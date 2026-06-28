'use client';

import { useEffect, useRef } from 'react';

/**
 * ScrollVideoHouse — scrubs a video by scroll position (Apple-style).
 *
 * The video is paused; scroll progress drives video.currentTime, so scrolling
 * down plays the orbit forward and scrolling up reverses it. Every angle is a
 * real rendered frame — no cross-fade softness.
 *
 * REQUIREMENT: the video MUST be encoded all-keyframe (run encode-for-scroll.sh).
 * A normal MP4 will stutter when scrubbed. This is the #1 gotcha.
 *
 * Usage:
 *   <ScrollVideoHouse
 *     mp4="/house_scroll.mp4"
 *     webm="/house_scroll.webm"
 *     height="300vh"     // scroll distance the rotation occupies
 *   />
 */
export default function ScrollVideoHouse({
  mp4 = '/house_scroll.mp4',
  webm = '/house_scroll.webm',
  height = '300vh',
  background = 'transparent',
}) {
  const sectionRef = useRef(null);
  const videoRef = useRef(null);
  const targetTime = useRef(0);
  const rafActive = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    const section = sectionRef.current;
    if (!video || !section) return;

    video.pause();

    const computeTarget = () => {
      const rect = section.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const progress = Math.min(1, Math.max(0, -rect.top / total));
      const dur = video.duration || 0;
      targetTime.current = progress * dur;
      if (!rafActive.current) {
        rafActive.current = true;
        requestAnimationFrame(tick);
      }
    };

    // ease currentTime toward the scroll target so fast scrolls stay smooth
    const tick = () => {
      const cur = video.currentTime;
      const diff = targetTime.current - cur;
      if (Math.abs(diff) < 0.005) {
        rafActive.current = false;
        return;
      }
      try {
        video.currentTime = cur + diff * 0.2;
      } catch (e) {}
      requestAnimationFrame(tick);
    };

    const onScroll = () => computeTarget();
    const onReady = () => computeTarget();

    window.addEventListener('scroll', onScroll, { passive: true });
    if (video.readyState >= 1) onReady();
    else video.addEventListener('loadedmetadata', onReady);

    return () => {
      window.removeEventListener('scroll', onScroll);
      video.removeEventListener('loadedmetadata', onReady);
    };
  }, []);

  return (
    <section ref={sectionRef} style={{ height, position: 'relative' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background,
        }}
      >
        <video
          ref={videoRef}
          muted
          playsInline
          preload="auto"
          style={{ width: '100%', maxWidth: 900, height: 'auto', objectFit: 'contain' }}
        >
          <source src={webm} type="video/webm" />
          <source src={mp4} type="video/mp4" />
        </video>
      </div>
    </section>
  );
}
