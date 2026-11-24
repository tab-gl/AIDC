import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { useReducedMotion } from "../lib/prefs";

/**
 * A dithered pixel field, adapted from ReactBits' Pixel Blast background
 * (reactbits.dev/backgrounds/pixel-blast). The original is a three.js scene; this is a
 * small canvas rebuild so the Astryx stack keeps no WebGL dependency. Pixels light up
 * where a slow wave field crosses the threshold, dim in a dither pattern, and brighten
 * around the pointer. The saved reduced-motion preference freezes it on one frame.
 */
export function PixelBlast({ className, cell = 14 }: { className?: string; cell?: number }) {
  const reducedMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let width = 0;
    let height = 0;
    let ink = "#1b1b1b";
    let frame = 0;
    let running = true;
    const pointer = { x: -9999, y: -9999, energy: 0 };

    const measure = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      ink = getComputedStyle(canvas).getPropertyValue("--color-text-primary").trim() || "#1b1b1b";
    };

    const paint = (time: number) => {
      context.clearRect(0, 0, width, height);
      context.fillStyle = ink;
      const columns = Math.ceil(width / cell);
      const rows = Math.ceil(height / cell);
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const x = column * cell;
          const y = row * cell;
          const waveX = x * 0.011;
          const waveY = y * 0.013;
          const wave = Math.sin(waveX + time * 0.00035)
            + Math.sin(waveY * 1.3 - time * 0.00027)
            + Math.sin((waveX + waveY) * 0.8 + time * 0.00019);
          const value = (wave + 3) / 6;
          const distance = Math.hypot(x - pointer.x, y - pointer.y);
          const glow = pointer.energy * Math.max(0, 1 - distance / 220);
          // A higher threshold on the dither edge keeps most of the field empty.
          const threshold = 0.64 - glow * 0.55;
          if (value <= threshold) continue;
          context.globalAlpha = Math.min(0.42, 0.09 + (value - threshold) * 1.3);
          context.fillRect(x, y, cell - 2, cell - 2);
        }
      }
      context.globalAlpha = 1;
      pointer.energy *= 0.94;
    };

    const loop = (time: number) => {
      if (!running) return;
      paint(time);
      frame = window.requestAnimationFrame(loop);
    };

    const start = () => {
      window.cancelAnimationFrame(frame);
      if (reducedMotion) { paint(0); return; }
      frame = window.requestAnimationFrame(loop);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.energy = Math.min(1, pointer.energy + 0.35);
    };

    measure();
    start();

    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => { measure(); if (reducedMotion) paint(0); });
    resizeObserver?.observe(canvas);
    const intersection = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver((entries) => {
      running = entries.some((entry) => entry.isIntersecting);
      if (running) start(); else window.cancelAnimationFrame(frame);
    });
    intersection?.observe(canvas);
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    return () => {
      running = false;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      resizeObserver?.disconnect();
      intersection?.disconnect();
    };
  }, [cell, reducedMotion]);

  return <motion.div
    className={`pixel-blast${className ? ` ${className}` : ""}`}
    aria-hidden="true"
    initial={reducedMotion ? false : { opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 1.2, ease: "easeOut" }}
  >
    <canvas ref={canvasRef} className="pixel-blast-canvas" />
  </motion.div>;
}
