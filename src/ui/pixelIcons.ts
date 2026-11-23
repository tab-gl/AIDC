// Pixel glyphs are ordered exactly as the supplied AIDC icon sheet: 8 columns × 7 rows.
// Unused cells at the end of short rows remain transparent in the sprite.
export const PIXEL_ICON_INDEX = {
  user: 0, "shield-key": 1, login: 2, logout: 3, grid: 4, home: 5,
  key: 8, link: 9, unlink: 10, devices: 11, gear: 12,
  bell: 16, "bell-off": 17, mail: 18, pencil: 19, edit: 20, trash: 21, clock: 22,
  eye: 24, "eye-off": 25, copy: 26, "clipboard-check": 27, check: 28, close: 29, "shield-check": 30,
  fingerprint: 32, qr: 33, "external-link": 34, refresh: 35, download: 36, upload: 37, sun: 38, moon: 39,
  "user-plus": 40, "check-circle": 41, "x-circle": 42, "chevron-down": 43, "arrow-right": 44, exchange: 45, lock: 46,
  alert: 48, pin: 49, calendar: 50, globe: 51, image: 52, save: 53, folder: 54, loader: 55,
  shield: 1, chart: 4, search: 8, plus: 40, spinner: 55
} as const;
export type PixelIconName = keyof typeof PIXEL_ICON_INDEX;
export const PIXEL_ICON_NAMES = Object.keys(PIXEL_ICON_INDEX) as PixelIconName[];
