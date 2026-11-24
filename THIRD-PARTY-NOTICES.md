# Third-party notices

AIDC vendors or adapts a small number of open-source components. Their notices are reproduced
here so the repository remains compliant when the frontend is redistributed as part of the
product.

## ReactBits Glass Surface (`src/ui/GlassSurface.tsx`, `src/ui/GlassSurface.css`)

Upstream: <https://reactbits.dev/components/glass-surface> by David Haz
(<https://github.com/DavidHDev/react-bits>). Vendored with TypeScript strict-mode fixes,
per-instance SVG ids, and defensive guards; the visual behaviour follows upstream.

License: MIT + Commons Clause License Condition v1.0. The component is used as part of this
application and is not sold, sublicensed, or redistributed on its own.

```
MIT + Commons Clause License Condition v1.0

Copyright (c) 2026 David Haz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, and distribute the Software **as part of an application, website, or product**, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

## Commons Clause Restriction

You may use this Software, including for any commercial purpose, **so long as you do not sell, sublicense, or redistribute the components themselves-whether alone, in a bundle, or as a ported version.**

The same restriction covers the React Bits tools (Background Studio, Texture Lab, Shape Magic, Center Stage, Sound Lab and any tools added later) and the sounds in the sound library. **You may not sell, sublicense, or redistribute the tools or the sounds themselves, or offer the tools or a substantially similar copy of them as a hosted service-whether alone, in a bundle, or as a ported version.**

What you make with the tools is yours to use. You can use exported code, images, videos, and audio files in any personal or commercial application, website, or product, including paid ones. **You may not sell or redistribute the exports on their own, either individually or as the product itself, such as a sound, texture, background, or template pack.**

## No Warranty

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Other adapted work

`src/ui/PixelBlast.tsx` is a small canvas rebuild of the ReactBits Pixel Blast background
(not a substantial copy of upstream code). `src/components/BranchedMenu.*` is adapted from
the ReactBits Branched Menu. Both are used only as part of this application.

