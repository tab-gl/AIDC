import type { CSSProperties, ReactNode, RefObject } from 'react';

export type GlassSurfaceChannel = 'R' | 'G' | 'B';

export type GlassSurfaceRenderer = 'auto' | 'svg' | 'webgl';

export type GlassSurfaceBackdrop = HTMLImageElement | HTMLVideoElement | HTMLCanvasElement;

export interface GlassSettings {
  backdrop?: RefObject<GlassSurfaceBackdrop | null> | GlassSurfaceBackdrop | null;
  displace: number;
  saturation: number;
  distortionScale: number;
  redOffset: number;
  greenOffset: number;
  blueOffset: number;
  xChannel: GlassSurfaceChannel;
  yChannel: GlassSurfaceChannel;
}

export interface ShapeBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ShapeTrace {
  box: ShapeBox;
  depth: Float32Array;
  w: number;
  h: number;
  ratio: number;
  line: string;
  glow: string;
}

export interface CachedTrace extends ShapeTrace {
  image: HTMLImageElement;
  width: number;
  height: number;
}

export type ShapeArt =
  | { src: string; box: ShapeBox; line: string; glow: string; failed?: false }
  | { src: string; failed: true };

export interface GlassSurfaceProps {
  children?: ReactNode;
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  borderWidth?: number;
  brightness?: number;
  opacity?: number;
  blur?: number;
  displace?: number;
  backgroundOpacity?: number;
  saturation?: number;
  distortionScale?: number;
  redOffset?: number;
  greenOffset?: number;
  blueOffset?: number;
  xChannel?: GlassSurfaceChannel;
  yChannel?: GlassSurfaceChannel;
  mixBlendMode?: CSSProperties['mixBlendMode'];
  refraction?: boolean;
  renderer?: GlassSurfaceRenderer;
  backdrop?: RefObject<GlassSurfaceBackdrop | null> | GlassSurfaceBackdrop | null;
  shape?: string;
  className?: string;
  style?: CSSProperties;
}

