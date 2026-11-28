/*
 * ReactBits "Glass Surface" (https://reactbits.dev/components/glass-surface), by David Haz.
 * Vendored so AIDC owns the component: the landing navbar and the phone navigation bar both
 * sit on it. Kept close to upstream, with TypeScript strict-mode fixes, duplicate SVG ids
 * removed, and defensive guards so a missing 2D canvas cannot break the shell.
 * License: MIT + Commons Clause v1.0; the full notice is in THIRD-PARTY-NOTICES.md.
 */
import { useEffect, useState, useRef, useId, type CSSProperties, type ReactNode, type RefObject } from 'react';
import './GlassSurface.css';

import { FAR, GLASS_VERTEX, GLASS_FRAGMENT, CHANNELS, compileGlass, resolveBackdrop, sourceSize, placeAxis, contentBox, distanceLine, distanceGrid, blurLine, blurGrid, settle, paint, shade, traceShape, bendShape } from './glass/core';
import type { GlassSettings, ShapeBox, ShapeTrace, CachedTrace, ShapeArt, GlassSurfaceBackdrop, GlassSurfaceProps, GlassSurfaceChannel, GlassSurfaceRenderer } from './glass/types';
export type { GlassSurfaceChannel, GlassSurfaceRenderer, GlassSurfaceBackdrop, GlassSurfaceProps } from './glass/types';

const GlassSurface = ({
  children,
  width = 200,
  height = 80,
  borderRadius = 20,
  borderWidth = 0.07,
  brightness = 50,
  opacity = 0.93,
  blur = 11,
  displace = 0,
  backgroundOpacity = 0,
  saturation = 1,
  distortionScale = -180,
  redOffset = 0,
  greenOffset = 10,
  blueOffset = 20,
  xChannel = 'R',
  yChannel = 'G',
  mixBlendMode = 'difference',
  refraction = true,
  renderer = 'auto',
  backdrop,
  shape,
  className = '',
  style = {}
}: GlassSurfaceProps) => {
  const uniqueId = useId().replace(/:/g, '-');
  const filterId = `glass-filter-${uniqueId}`;
  const redGradId = `red-grad-${uniqueId}`;
  const blueGradId = `blue-grad-${uniqueId}`;
  const softId = `soft-${uniqueId}`;

  const [svgSupported, setSvgSupported] = useState<boolean>(false);
  const [checked, setChecked] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);
  const [boxSize, setBoxSize] = useState<string>('');
  const [loaded, setLoaded] = useState<{ src: string; image: HTMLImageElement | null }>({ src: '', image: null });
  const [art, setArt] = useState<ShapeArt | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const feImageRef = useRef<SVGFEImageElement>(null);
  const redChannelRef = useRef<SVGFEDisplacementMapElement>(null);
  const greenChannelRef = useRef<SVGFEDisplacementMapElement>(null);
  const blueChannelRef = useRef<SVGFEDisplacementMapElement>(null);
  const gaussianBlurRef = useRef<SVGFEGaussianBlurElement>(null);
  const traceRef = useRef<CachedTrace | null>(null);
  const shapeMapRef = useRef<string>('');
  const mapUrlRef = useRef('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const settingsRef = useRef<GlassSettings | null>(null);
  settingsRef.current = {
    backdrop,
    displace,
    saturation,
    distortionScale,
    redOffset,
    greenOffset,
    blueOffset,
    xChannel,
    yChannel
  };

  const generateDisplacementMap = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    const actualWidth = rect?.width || 400;
    const actualHeight = rect?.height || 200;
    const edgeSize = Math.min(actualWidth, actualHeight) * (borderWidth * 0.5);

    const svgContent = `
      <svg width="${actualWidth}" height="${actualHeight}" viewBox="0 0 ${actualWidth} ${actualHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${redGradId}" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="red"/>
          </linearGradient>
          <linearGradient id="${blueGradId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="blue"/>
          </linearGradient>
          <filter id="${softId}" filterUnits="userSpaceOnUse" x="0" y="0" width="${actualWidth}" height="${actualHeight}" color-interpolation-filters="sRGB">
            <feGaussianBlur stdDeviation="${blur}" />
          </filter>
        </defs>
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" fill="black"></rect>
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${borderRadius}" fill="url(#${redGradId})" />
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${borderRadius}" fill="url(#${blueGradId})" style="mix-blend-mode: ${mixBlendMode}" />
        <rect x="${edgeSize}" y="${edgeSize}" width="${actualWidth - edgeSize * 2}" height="${actualHeight - edgeSize * 2}" rx="${borderRadius}" fill="hsl(0 0% ${brightness}% / ${opacity})" filter="url(#${softId})" />
      </svg>
    `;

    return `data:image/svg+xml,${encodeURIComponent(svgContent)}`;
  };

  const updateDisplacementMap = () => {
    mapUrlRef.current = shapeMapRef.current || generateDisplacementMap();
    feImageRef.current?.setAttribute('href', mapUrlRef.current);
  };

  useEffect(() => {
    updateDisplacementMap();
    [
      { ref: redChannelRef, offset: redOffset },
      { ref: greenChannelRef, offset: greenOffset },
      { ref: blueChannelRef, offset: blueOffset }
    ].forEach(({ ref, offset }) => {
      if (ref.current) {
        ref.current.setAttribute('scale', (distortionScale + offset).toString());
        ref.current.setAttribute('xChannelSelector', xChannel);
        ref.current.setAttribute('yChannelSelector', yChannel);
      }
    });

    gaussianBlurRef.current?.setAttribute('stdDeviation', displace.toString());
  }, [
    boxSize,
    width,
    height,
    borderRadius,
    borderWidth,
    brightness,
    opacity,
    blur,
    displace,
    distortionScale,
    redOffset,
    greenOffset,
    blueOffset,
    xChannel,
    yChannel,
    mixBlendMode
  ]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    // Tests and older embedded browsers may not ship ResizeObserver; the glass still draws
    // from the initial measurement, it simply does not react to later resizes.
    if (typeof ResizeObserver === "undefined") {
      setBoxSize(`${element.offsetWidth}x${element.offsetHeight}`);
      return;
    }
    const resizeObserver = new ResizeObserver(() => {
      const current = containerRef.current;
      if (current) setBoxSize(`${current.offsetWidth}x${current.offsetHeight}`);
    });
    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!shape) return undefined;
    let alive = true;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.onload = () => alive && setLoaded({ src: shape, image });
    image.onerror = () => alive && setLoaded({ src: shape, image: null });
    image.src = shape;
    return () => {
      alive = false;
    };
  }, [shape]);

  const shapeImage = shape && loaded.src === shape ? loaded.image : null;

  useEffect(() => {
    const element = containerRef.current;
    const w = element?.offsetWidth || 0;
    const h = element?.offsetHeight || 0;
    let map = '';
    let trace: CachedTrace | null = null;
    if (shapeImage && w && h) {
      const ratio = Math.min(2, window.devicePixelRatio || 1, Math.sqrt(400000 / (w * h)));
      trace = traceRef.current;
      try {
        if (!trace || trace.image !== shapeImage || trace.width !== w || trace.height !== h || trace.ratio !== ratio) {
          const traced = traceShape(shapeImage, w, h, ratio);
          if (!traced) throw new Error("Glass shape trace unavailable");
          trace = { image: shapeImage, width: w, height: h, ...traced };
          traceRef.current = trace;
        }
        map = bendShape(trace, Math.min(w, h) * borderWidth * 0.5, Math.max(blur, 0.5), opacity, brightness / 100);
      } catch {
        trace = null;
        traceRef.current = null;
      }
    }
    shapeMapRef.current = map;
    updateDisplacementMap();
    if (shape && trace) setArt({ src: shape, box: trace.box, line: trace.line, glow: trace.glow });
    else if (shape && loaded.src === shape) setArt({ src: shape, failed: true });
  }, [shape, loaded, boxSize, borderWidth, blur, opacity, brightness]);

  useEffect(() => {
    setSvgSupported(supportsSVGFilters());
    setChecked(true);
  }, []);

  const webgl =
    checked &&
    refraction &&
    Boolean(backdrop) &&
    !webglFailed &&
    (renderer === 'webgl' || (renderer === 'auto' && !svgSupported));
  const refractive = !webgl && svgSupported && refraction;
  const frosted = !webgl && !refractive;

  useEffect(() => {
    if (!webgl) return undefined;
    const canvas = canvasRef.current;
    const element = containerRef.current;
    const gl = canvas?.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false
    });
    const program = gl ? compileGlass(gl) : null;
    if (!canvas || !element || !gl || !program) {
      setWebglFailed(true);
      return undefined;
    }

    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    [
      'uBackdrop',
      'uMap',
      'uCanvas',
      'uSize',
      'uOrigin',
      'uStep',
      'uScale',
      'uChannel',
      'uSpread',
      'uLod',
      'uSaturation'
    ].forEach(name => {
      uniforms[name] = gl.getUniformLocation(program, name);
    });
    const uniform = (name: string) => uniforms[name] ?? null;
    const vao = gl.createVertexArray();
    const buffer = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

    const makeTexture = () => {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return texture;
    };
    const backdropTexture = makeTexture();
    const mapTexture = makeTexture();
    const mapCanvas = document.createElement('canvas');
    const mapContext = mapCanvas.getContext('2d');
    const picture = {
      node: null as GlassSurfaceBackdrop | null,
      key: '',
      width: 0,
      height: 0,
      mipmapped: false,
      ready: false
    };
    const map = { url: '', ready: false };
    let frame = 0;
    let visible = true;
    let drawn = '';

    const loadMap = (url: string) => {
      map.url = url;
      const image = new Image();
      image.onload = () => {
        if (map.url !== url || !mapContext) return;
        const ratio = Math.min(2, window.devicePixelRatio || 1);
        mapCanvas.width = Math.max(1, Math.round(element.offsetWidth * ratio));
        mapCanvas.height = Math.max(1, Math.round(element.offsetHeight * ratio));
        mapContext.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
        mapContext.drawImage(image, 0, 0, mapCanvas.width, mapCanvas.height);
        gl.bindTexture(gl.TEXTURE_2D, mapTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mapCanvas);
        map.ready = true;
        drawn = '';
      };
      image.src = url;
    };

    const upload = (node: GlassSurfaceBackdrop) => {
      const still = node instanceof HTMLImageElement;
      gl.bindTexture(gl.TEXTURE_2D, backdropTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, node);
      if (still) gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, still ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
      [picture.width, picture.height] = sourceSize(node);
      picture.mipmapped = still;
      picture.ready = true;
    };

    const tick = () => {
      frame = 0;
      if (!visible || document.hidden) return;
      frame = requestAnimationFrame(tick);
      const s = settingsRef.current;
      if (!s) return;
      if (mapUrlRef.current && mapUrlRef.current !== map.url) loadMap(mapUrlRef.current);
      const node = resolveBackdrop(s.backdrop);
      if (!node) return;
      let key = '';
      if (node instanceof HTMLImageElement) key = node.complete && node.naturalWidth ? node.currentSrc || node.src : '';
      else if (node instanceof HTMLVideoElement)
        key = node.readyState >= 2 ? `${node.currentSrc}|${node.currentTime}` : '';
      else key = `${node.width}x${node.height}|${performance.now()}`;
      if (key && (node !== picture.node || key !== picture.key)) {
        try {
          upload(node);
        } catch {
          setWebglFailed(true);
          return;
        }
        picture.node = node;
        picture.key = key;
        drawn = '';
      }
      if (!picture.ready || !map.ready) return;

      const layoutWidth = element.offsetWidth;
      const layoutHeight = element.offsetHeight;
      if (!layoutWidth || !layoutHeight) return;
      const box = element.getBoundingClientRect();
      const content = contentBox(node);
      if (!content.width || !content.height) return;
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.round(layoutWidth * ratio));
      const height = Math.max(1, Math.round(layoutHeight * ratio));
      const signature = [
        box.left,
        box.top,
        box.width,
        box.height,
        content.x,
        content.y,
        content.width,
        content.height,
        width,
        height,
        picture.key,
        map.url,
        s.displace,
        s.saturation,
        s.distortionScale,
        s.redOffset,
        s.greenOffset,
        s.blueOffset,
        s.xChannel,
        s.yChannel
      ].join('|');
      if (signature === drawn) return;
      drawn = signature;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const scaleX = box.width / layoutWidth;
      const scaleY = box.height / layoutHeight;
      const texelsPerPixel = (picture.width / content.width) * (scaleX / ratio);
      const spreadTexels = (picture.width / content.width) * scaleX * Math.max(0, s.displace);
      const lod = picture.mipmapped
        ? Math.max(0, Math.log2(Math.max(texelsPerPixel, spreadTexels * 0.5, 0.000001)))
        : 0;
      gl.viewport(0, 0, width, height);
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, backdropTexture);
      gl.uniform1i(uniform("uBackdrop"), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, mapTexture);
      gl.uniform1i(uniform("uMap"), 1);
      gl.uniform2f(uniform("uCanvas"), width, height);
      gl.uniform2f(uniform("uSize"), layoutWidth, layoutHeight);
      gl.uniform2f(uniform("uOrigin"), (box.left - content.x) / content.width, (box.top - content.y) / content.height);
      gl.uniform2f(uniform("uStep"), scaleX / content.width, scaleY / content.height);
      gl.uniform3f(
        uniform("uScale"),
        s.distortionScale + s.redOffset,
        s.distortionScale + s.greenOffset,
        s.distortionScale + s.blueOffset
      );
      gl.uniform2i(uniform("uChannel"), CHANNELS[s.xChannel] ?? 0, CHANNELS[s.yChannel] ?? 1);
      gl.uniform1f(uniform("uSpread"), Math.max(0, s.displace));
      gl.uniform1f(uniform("uLod"), lod);
      gl.uniform1f(uniform("uSaturation"), s.saturation);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const wake = () => {
      if (!frame && visible && !document.hidden) frame = requestAnimationFrame(tick);
    };
    const onLost = (event: Event) => {
      event.preventDefault();
      setWebglFailed(true);
    };
    const intersection = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      wake();
    });
    intersection?.observe(element);
    document.addEventListener('visibilitychange', wake);
    canvas.addEventListener('webglcontextlost', onLost);
    wake();

    return () => {
      cancelAnimationFrame(frame);
      intersection?.disconnect();
      document.removeEventListener('visibilitychange', wake);
      canvas.removeEventListener('webglcontextlost', onLost);
      gl.deleteTexture(backdropTexture);
      gl.deleteTexture(mapTexture);
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
    };
  }, [webgl]);

  const supportsSVGFilters = () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return false;
    }

    const isWebkit = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const isFirefox = /Firefox/.test(navigator.userAgent);

    if (isWebkit || isFirefox) {
      return false;
    }

    const div = document.createElement('div');
    div.style.backdropFilter = `url(#${filterId})`;

    return div.style.backdropFilter !== '';
  };

  const outline = shape && art?.src === shape && !art.failed ? art : null;
  const maskUrl = outline ? `url("${outline.src.replace(/"/g, '%22').replace(/[\n\r]+/g, ' ')}")` : '';
  const maskPlace = outline
    ? `${outline.box.x}px ${outline.box.y}px / ${outline.box.width}px ${outline.box.height}px no-repeat`
    : '';
  const shapeStyle: CSSProperties = outline
    ? { borderRadius: 0, boxShadow: 'none', WebkitMask: `${maskUrl} ${maskPlace}`, mask: `${maskUrl} ${maskPlace}` }
    : shape && art?.src !== shape
      ? { opacity: 0, transition: 'none' }
      : {};

  const containerStyle = {
    ...style,
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: `${borderRadius}px`,
    '--glass-frost': backgroundOpacity,
    '--glass-saturation': saturation,
    '--filter-id': `url(#${filterId})`,
    ...shapeStyle
  } as CSSProperties;

  return (
    <div
      ref={containerRef}
      className={['glass-surface', webgl ? 'glass-surface--webgl' : refractive ? 'glass-surface--svg' : 'glass-surface--fallback', className].filter(Boolean).join(' ')}
      style={containerStyle}
    >
      <svg className="glass-surface__filter" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id={filterId} colorInterpolationFilters="sRGB" x="0%" y="0%" width="100%" height="100%">
            <feImage ref={feImageRef} x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map" />

            <feDisplacementMap ref={redChannelRef} in="SourceGraphic" in2="map" result="dispRed" />
            <feColorMatrix
              in="dispRed"
              type="matrix"
              values="1 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0"
              result="red"
            />

            <feDisplacementMap
              ref={greenChannelRef}
              in="SourceGraphic"
              in2="map"
              result="dispGreen"
            />
            <feColorMatrix
              in="dispGreen"
              type="matrix"
              values="0 0 0 0 0
                      0 1 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0"
              result="green"
            />

            <feDisplacementMap ref={blueChannelRef} in="SourceGraphic" in2="map" result="dispBlue" />
            <feColorMatrix
              in="dispBlue"
              type="matrix"
              values="0 0 0 0 0
                      0 0 0 0 0
                      0 0 1 0 0
                      0 0 0 1 0"
              result="blue"
            />

            <feBlend in="red" in2="green" mode="screen" result="rg" />
            <feBlend in="rg" in2="blue" mode="screen" result="output" />
            <feGaussianBlur ref={gaussianBlurRef} in="output" stdDeviation="0.7" />
          </filter>
        </defs>
      </svg>

      {webgl && <canvas ref={canvasRef} className="glass-surface__canvas" aria-hidden="true" />}
      {webgl && (
        <span className="glass-surface__frame" aria-hidden="true" style={outline ? { boxShadow: 'none' } : undefined} />
      )}
      {frosted && <span className="glass-surface__sheen" aria-hidden="true" />}
      {frosted && !outline && <span className="glass-surface__rim" aria-hidden="true" />}
      {outline && (
        <span
          className="glass-surface__glow"
          aria-hidden="true"
          style={{ WebkitMaskImage: `url(${outline.glow})`, maskImage: `url(${outline.glow})` }}
        />
      )}
      {outline && (
        <span
          className="glass-surface__line"
          aria-hidden="true"
          style={{ WebkitMaskImage: `url(${outline.line})`, maskImage: `url(${outline.line})` }}
        />
      )}

      <div className="glass-surface__content">{children}</div>
    </div>
  );
};

export default GlassSurface;
