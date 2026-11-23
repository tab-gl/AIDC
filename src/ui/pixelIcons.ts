// Pixel glyphs traced directly from the supplied AIDC icon sheet.
// The 7 × 7 transparent sprite keeps the original chunky, monochrome pixel style.
export const PIXEL_ICON_INDEX = {
  "shield-key": 0, home: 1, user: 2, login: 3, logout: 4, grid: 5, key: 6,
  gear: 7, link: 8, unlink: 9, devices: 10, trash: 11, bell: 12, "bell-off": 13,
  edit: 14, pencil: 15, clock: 16, mail: 17, "clipboard-check": 18, "shield-check": 19,
  "eye-off": 20, copy: 21, eye: 22, check: 23, close: 24, fingerprint: 25, qr: 26,
  sun: 27, moon: 28, "external-link": 29, download: 30, upload: 31, refresh: 32,
  exchange: 33, lock: 34, "user-plus": 35, "check-circle": 36, "x-circle": 37,
  "arrow-right": 38, "chevron-down": 39, pin: 40, calendar: 41, alert: 42, globe: 43,
  loader: 44, save: 45, folder: 46, image: 47,
  shield: 0, chart: 5, search: 6, plus: 35, spinner: 44
} as const;
export type PixelIconName = keyof typeof PIXEL_ICON_INDEX;
export const PIXEL_ICON_NAMES = Object.keys(PIXEL_ICON_INDEX) as PixelIconName[];
