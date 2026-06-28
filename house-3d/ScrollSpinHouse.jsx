'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * ScrollSpinHouse — rotates a house through N angle images as the user scrolls,
 * cross-fading adjacent frames so 4 photos read as one continuous turn.
 *
 * No 3D, no WebGL — just stacked <img>s whose opacity is driven by scroll
 * progress. Pixel-perfect (each frame is your finished render), tiny, and
 * works on every device.
 *
 * Usage:
 *   <ScrollSpinHouse
 *     frames={['/angle1.png','/angle2.png','/angle3.png','/angle4.png']}
 *     turns={1}            // full revolutions across the scroll section
 *     height="300vh"       // taller = slower, more deliberate rotation
 *     loop                 // blend last frame back into the first
 *   />
 *
 * Frame order must be the rotation order (e.g. front → right → back → left).
 */
export default function ScrollSpinHouse({
  frames = ['/angle1.jpg', '/angle2.jpg', '/angle3.jpg', '/angle4.jpg'],
  turns = 1,
  height = '300vh',
  loop = true,
  background = 'transparent',
}) {
  const sectionRef = useRef(null);
  const imgRefs = useRef([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const n = frames.length;

    const apply = (progress) => {
      // total position along the frame axis
      const pos = (progress * turns * n) % n;
      for (let i = 0; i < n; i++) {
        let d = Math.abs(((pos - i) % n + n) % n);
        if (loop && d > n / 2) d = n - d;        // wrap distance when looping
        const opacity = Math.max(0, 1 - d);       // only adjacent frames show
        const el = imgRefs.current[i];
        if (el) el.style.opacity = opacity.toFixed(3);
      }
    };

    const onScroll = () => {
      const sec = sectionRef.current;
      if (!sec) return;
      const rect = sec.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const progress = Math.min(1, Math.max(0, -rect.top / total));
      apply(progress);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    setLoaded(true);
    return () => window.removeEventListener('scroll', onScroll);
  }, [frames, turns, loop]);

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
        <div style={{ position: 'relative', width: '100%', maxWidth: 900, aspectRatio: '16 / 9' }}>
          {frames.map((src, i) => (
            <img
              key={src}
              ref={(el) => (imgRefs.current[i] = el)}
              src={src}
              alt=""
              aria-hidden={i !== 0}
              draggable={false}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                opacity: i === 0 ? 1 : 0,
                willChange: 'opacity',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
