# glass-lens-react

[![CI](https://github.com/jvreeken/glass-lens-react/actions/workflows/ci.yml/badge.svg)](https://github.com/jvreeken/glass-lens-react/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/glass-lens-react.svg)](https://www.npmjs.com/package/glass-lens-react)
[![demo](https://img.shields.io/badge/demo-live-7c3aed)](https://glass-lens-react.vercel.app)

Liquid-glass UI for React — a refracting "glass" surface you can drop into any
control, plus a bouncing scroll cue, a global light source (with optional
device-tilt + a shimmer sweep), and a live tuner.

**→ [Live demo](https://glass-lens-react.vercel.app)** — best on Chromium: glass
over playing video, photos, gradients, and patterns, with the tuner built in.

One API, **three render paths chosen automatically per platform** so the glass
actually refracts everywhere:

- **Chromium** → `backdrop-filter` + an SVG displacement filter (cheap).
- **Safari / Firefox over a still image** → a captured-backdrop `<canvas>` + `filter`.
- **Any browser over live `<video>`** → a WebGL lens that reads the video as a
  texture (backdrop-filter over a playing video renders black, so this is used
  everywhere for video).

Zero styling dependencies — no Tailwind required. Just import one small CSS file.

```bash
npm i glass-lens-react
```

> **Demo:** see it live at **<https://glass-lens-react.vercel.app>**, or run it
> yourself with `cd examples/demo && pnpm install && pnpm dev` (a runnable
> showcase and a quick smoke test of the package source).

## Quick start

```tsx
import { GlassSurface } from "glass-lens-react"
import "glass-lens-react/styles.css" // once, anywhere in your app

export function GlassButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="glass-control"
      style={{
        position: "relative",
        display: "grid",
        placeItems: "center",
        width: 44,
        height: 44,
        overflow: "hidden",
        borderRadius: 9999,
        border: 0,
        background: "transparent",
        cursor: "pointer",
      }}
    >
      <GlassSurface preset="portfolio" reveal />
      <span className="glass-icon" style={{ position: "relative", color: "#fff" }}>
        {children}
      </span>
    </button>
  )
}
```

Drop `<GlassSurface/>` as the **first child** of a **positioned, `overflow:hidden`,
rounded** control; it fills the control (`position:absolute; inset:0`) and refracts
whatever sits behind. Put your icon/label **after** it so it stays on top. (Using
Tailwind? The same thing is `className="glass-control relative grid size-11
place-items-center overflow-hidden rounded-full"`.)

No providers are required for the basic case — `GlassSurface` works on its own.
Add the providers below only for the global light / tilt / shimmer or the tuner.

## `<GlassSurface>`

| prop | default | notes |
| --- | --- | --- |
| `preset` | `"hero"` | named look — `hero` \| `portfolio` \| `plaque` (see `GLASS_PRESETS`) |
| `reveal` | `false` | hover/focus/active brightness lift — needs `glass-control` on the host |
| `refract` | `true` | edge refraction on/off (off ⇒ frosted only) |
| `live` | `false` | re-capture every frame the backdrop moves (canvas path) |
| `standalone` | `false` | self-manage a video lens for a control **outside** the hero (below) |
| `captureKey` | – | change to re-capture on an in-place backdrop swap (canvas path) |
| look params | from preset | per-instance overrides (below) |
| `className` | `""` | extra classes on the surface root |

### Look params

`blur`, `saturate` (frost) · `scale` (rim refraction), `bezel` (rim band width),
`curve` (rim falloff) · `thickness` (convex whole-surface lensing — a thick dome
that magnifies) · `dispersion` (chromatic aberration — coloured rim fringes) ·
`edge` (specular highlight — its **direction** is the global light angle) · `glow`
(inner rim glow), `tint` (frosted body fill), `border` (rim line), `radius`
(corner; `999` = pill/circle).

## Presets & the tuner

`GLASS_PRESETS` is the single source of truth for every look (`hero`, `portfolio`,
`plaque`). Edit one and every surface using it updates.

Wrap your app in `GlassTunerProvider` to enable a live tuner: press **Shift+G** (or
add `?glass` to the URL) to open a panel, pick which preset to drive, drag the
sliders — the on-page surfaces update live and ring themselves so you can see what
you're adjusting. Hit **copy preset** to grab the JSON and paste it into
`GLASS_PRESETS`.

```tsx
import { GlassTunerProvider } from "glass-lens-react"
// <GlassTunerProvider>{app}</GlassTunerProvider>
```

Open it from your own UI (a settings button, say) with
`useGlassTunerControl()?.setOpen(true)`.

## Light source — global, tilt, shimmer

The specular highlight's direction is a single **global** angle. Wrap your app once
in `GlassLightProvider` to control it:

- **Device tilt** — the light eases toward the phone's tilt direction and holds
  there; it self-calibrates a resting baseline to wherever you settle the phone. On
  iOS the motion sensor needs permission, requested the first time you tap any glass
  control.
- **Shimmer** — a one-shot 360° sweep of the angle whips the highlight around every
  rim at once. Fired on load and on any button/link click.

```tsx
import { GlassLightProvider } from "glass-lens-react"
// <GlassLightProvider>{app}</GlassLightProvider>
```

`useGlassLight()` reads the angle; `useGlassLightControl()` exposes the base /
sensor controls (the tuner uses it).

## `<ScrollCue>`

A bouncing, glass scroll-down button. `targetId` smooth-scrolls to an element, or
pass `onClick`. Takes a `preset` like `GlassSurface`.

```tsx
import { ScrollCue } from "glass-lens-react"
<ScrollCue targetId="content" label="Scroll to content" />
```

## Live video & out-of-hero controls (advanced)

For a control **over live video** the surface uses the WebGL lens. A few opt-in DOM
markers make it work; all are plain attributes you add to your own elements:

- Mark the element holding the **active video** (or its poster) `data-hero-active`
  — the lens samples it.
- A control **outside** that container (e.g. a fixed header button) can still lens
  the video: give its `<GlassSurface standalone />`. It auto-detects when it's over
  the video (scroll- and occlusion-aware), refracts + composites the wash there, and
  frosts otherwise.
- Tag readability scrims over the video `data-glass-wash` so lenses darken to match
  the scene; tag a full-screen overlay (open menu/modal) `data-glass-occluder` so a
  standalone lens frosts instead of refracting the hidden video while it's up.

## CSS helpers (from `glass-lens-react/styles.css`)

- `glass-control` — put on the host control to enable `reveal`.
- `glass-icon` — a dark drop-shadow so a light icon stays legible over the glass.
- `glass-in` — fade a control in on first paint (hides any first-frame flash).
- `glass-bounce` — the scroll-cue bounce (used internally).

## License

MIT © James Vreeken
