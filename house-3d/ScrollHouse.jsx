'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * ScrollHouse — a 3D house that re-angles as the user scrolls.
 *
 * Drop house_model.glb into /public and render <ScrollHouse /> in a tall section.
 * The model's Y-rotation is driven by scroll progress through the section,
 * so scrolling down rotates the house. Apple-style scroll-rotate.
 *
 * Props:
 *   src         path to the glb (default '/house_model.glb')
 *   turns       how many full rotations across the scroll section (default 0.75)
 *   height      section height in viewport units (default '300vh')
 */
export default function ScrollHouse({ src = '/house_model.glb', turns = 0.75, height = '300vh' }) {
  const mountRef = useRef(null);
  const sectionRef = useRef(null);
  const targetRotY = useRef(0);

  useEffect(() => {
    const mount = mountRef.current;
    const w = mount.clientWidth;
    const h = mount.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 0.1, 3.4);

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(2, 3, 4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.5);
    fill.position.set(-3, 1, -2);
    scene.add(fill);

    let model = null;
    new GLTFLoader().load(src, (gltf) => {
      model = gltf.scene;
      model.traverse((o) => {
        if (o.isMesh) {
          o.material.side = THREE.DoubleSide;
          o.material.metalness = 0;
          o.material.roughness = 1;
        }
      });
      scene.add(model);
    });

    // scroll → target rotation
    const onScroll = () => {
      const sec = sectionRef.current;
      if (!sec) return;
      const rect = sec.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const progress = Math.min(1, Math.max(0, -rect.top / total));
      targetRotY.current = progress * turns * Math.PI * 2;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    let raf;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (model) {
        // ease toward the scroll target for buttery motion
        model.rotation.y += (targetRotY.current - model.rotation.y) * 0.08;
      }
      renderer.render(scene, camera);
    };
    loop();

    const onResize = () => {
      const nw = mount.clientWidth, nh = mount.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [src, turns]);

  return (
    <section ref={sectionRef} style={{ height, position: 'relative' }}>
      <div
        ref={mountRef}
        style={{ position: 'sticky', top: 0, height: '100vh', width: '100%' }}
      />
    </section>
  );
}
