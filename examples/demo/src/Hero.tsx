import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react"
import {
  GlassSurface,
  ScrollCue,
  GlassLensCtx,
  WEBGL_VIDEO,
  GLASS_PRESETS,
  createGlassRenderer,
  useGlassTuner,
  useGlassTunerControl,
} from "glass-kit"

// Each `base` resolves to `${base}.av1.mp4` (AV1), `${base}.mp4` (H.264 fallback)
// and `${base}.jpg` (poster). They're same-origin so the WebGL texture isn't
// tainted. Swap in your own — anything in /public works.
const SLIDES = [
  {
    base: "/videos/video-1",
    kicker: "Liquid glass for React",
    title: "Refracts whatever's behind it",
  },
  {
    base: "/videos/video-2",
    kicker: "One API · every browser",
    title: "Even over playing video",
  },
  {
    base: "/videos/video-3",
    kicker: "Zero styling deps · MIT",
    title: "npm i glass-kit",
  },
]

const cover: CSSProperties = {
  position: "absolute",
  inset: 0,
  height: "100%",
  width: "100%",
  objectFit: "cover",
}

export function Hero() {
  const n = SLIDES.length
  const [index, setIndex] = useState(0)
  const [mounted, setMounted] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const glCanvasRef = useRef<HTMLCanvasElement>(null)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const rendererRef = useRef<ReturnType<typeof createGlassRenderer>>(null)
  const tuner = useGlassTuner()
  const tunerCtl = useGlassTunerControl()

  useEffect(() => setMounted(true), [])

  // Auto-advance the slideshow.
  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % n), 6000)
    return () => clearInterval(t)
  }, [n])

  // Only the active slide's video plays.
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return
      if (i === index) void v.play().catch(() => {})
      else v.pause()
    })
  }, [index])

  // The hero owns one WebGL lens renderer: each frame it reads the active video as
  // a texture and draws a lens for every in-hero `.glass-lens` control (the arrows,
  // pill and scroll cue below switch to lens-mode via GlassLensCtx). This is the
  // pattern for refracting LIVE video — backdrop-filter over a playing <video>
  // goes black, so glass-kit reads the pixels in a shader instead.
  const webglOn = mounted && WEBGL_VIDEO
  useEffect(() => {
    if (!webglOn || !glCanvasRef.current || !sectionRef.current) return
    const p = GLASS_PRESETS.hero
    const r = createGlassRenderer(glCanvasRef.current, sectionRef.current, {
      scale: p.scale / 2,
      bezel: p.bezel,
      curve: p.curve,
      thickness: p.thickness,
      dispersion: p.dispersion,
      blur: p.blur,
      saturate: p.saturate,
    })
    rendererRef.current = r
    return () => {
      r?.destroy()
      rendererRef.current = null
    }
  }, [webglOn])

  // Let the tuner drive the live WebGL refraction too.
  useEffect(() => {
    const p = tuner ? tuner.params.hero : GLASS_PRESETS.hero
    rendererRef.current?.setParams({
      scale: p.scale / 2,
      bezel: p.bezel,
      curve: p.curve,
      thickness: p.thickness,
      dispersion: p.dispersion,
      blur: p.blur,
      saturate: p.saturate,
    })
  }, [tuner, webglOn])

  const go = useCallback((i: number) => setIndex(((i % n) + n) % n), [n])

  return (
    <GlassLensCtx.Provider value={webglOn}>
      <section
        ref={sectionRef}
        // No bg here: the dark fallback lives on <body>, so the caption pane's
        // standalone lens doesn't mistake an opaque ancestor for an occluder.
        style={{ position: "relative", height: "100svh", overflow: "hidden" }}
      >
        {SLIDES.map((s, i) => {
          const active = i === index
          return (
            <div
              key={s.base}
              data-hero-active={active ? "" : undefined}
              style={{
                ...cover,
                zIndex: active ? 10 : 0,
                opacity: active ? 1 : 0,
                transition: "opacity 1200ms ease-out",
              }}
            >
              {/* A real <img> behind the clip gives the lens something to refract
                  until the video decodes (the lens path can't texture a poster
                  attribute). */}
              {webglOn && (
                <img src={`${s.base}.jpg`} alt="" aria-hidden style={cover} />
              )}
              <video
                ref={(el) => {
                  videoRefs.current[i] = el
                }}
                poster={`${s.base}.jpg`}
                muted
                loop
                playsInline
                preload="auto"
                style={cover}
              >
                <source
                  src={`${s.base}.av1.mp4`}
                  type='video/mp4; codecs="av01.0.05M.08"'
                />
                <source src={`${s.base}.mp4`} type="video/mp4" />
              </video>
            </div>
          )
        })}

        {/* Readability washes — tagged data-glass-wash so the lenses darken to
            match the scene instead of reading as bright cut-outs. */}
        <div
          data-glass-wash
          style={{ ...cover, zIndex: 20, background: "rgba(0,0,0,0.18)" }}
        />
        <div
          data-glass-wash
          style={{
            ...cover,
            zIndex: 20,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0.05) 45%, rgba(0,0,0,0.3))",
          }}
        />

        {/* WebGL lens overlay — above the video, below the washes + controls. */}
        {webglOn && (
          <canvas
            ref={glCanvasRef}
            aria-hidden
            style={{ ...cover, zIndex: 15, pointerEvents: "none" }}
          />
        )}

        {/* Caption — contained in a "Pane" (plaque) glass surface. It's opted OUT
            of the hero's shared lens (GlassLensCtx=false) so it draws its OWN plaque
            lens over the video — tweakable live via the tuner's "Pane" sliders. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 25,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            // Stay clear of the prev/next arrows (which sit ~64px in from each edge).
            padding: "24px clamp(84px, 11vw, 160px)",
            pointerEvents: "none",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <GlassLensCtx.Provider value={false}>
            <div
              style={{
                position: "relative",
                pointerEvents: "auto",
                overflow: "hidden",
                borderRadius: 18,
                padding: "30px 40px 28px",
                maxWidth: 520,
                textAlign: "center",
              }}
            >
              <GlassSurface preset="plaque" standalone radius={18} />
              <div
                style={{
                  position: "relative",
                  color: "#fff",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 20,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      letterSpacing: "0.28em",
                      textTransform: "uppercase",
                      opacity: 0.85,
                    }}
                  >
                    {SLIDES[index].kicker}
                  </div>
                  <div
                    style={{
                      fontSize: "clamp(1.7rem, 5vw, 3.4rem)",
                      fontWeight: 300,
                      marginTop: 10,
                      textWrap: "balance",
                    }}
                  >
                    {SLIDES[index].title}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => tunerCtl?.setOpen(true)}
                  style={{
                    cursor: "pointer",
                    border: "1px solid rgba(255,255,255,0.6)",
                    background: "rgba(255,255,255,0.12)",
                    color: "#fff",
                    borderRadius: 9999,
                    padding: "9px 22px",
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                  }}
                >
                  Settings
                </button>
              </div>
            </div>
          </GlassLensCtx.Provider>
        </div>

        {/* Prev / next — in-hero glass controls (lens-mode over the video). */}
        <button
          type="button"
          aria-label="Previous"
          onClick={() => go(index - 1)}
          className="glass-control glass-in"
          style={{ ...arrowStyle, left: 16 }}
        >
          <GlassSurface preset="hero" reveal />
          <Chevron dir="left" />
        </button>
        <button
          type="button"
          aria-label="Next"
          onClick={() => go(index + 1)}
          className="glass-control glass-in"
          style={{ ...arrowStyle, right: 16 }}
        >
          <GlassSurface preset="hero" reveal />
          <Chevron dir="right" />
        </button>

        {/* Progress pill */}
        <div
          className="glass-in"
          style={{
            position: "absolute",
            bottom: 92,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 30,
          }}
        >
          <div
            style={{
              position: "relative",
              display: "flex",
              gap: 8,
              alignItems: "center",
              overflow: "hidden",
              borderRadius: 9999,
              padding: "10px 14px",
            }}
          >
            <GlassSurface preset="hero" />
            {SLIDES.map((s, i) => (
              <button
                key={s.base}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => go(i)}
                style={{
                  position: "relative",
                  height: 6,
                  width: 36,
                  borderRadius: 9999,
                  border: 0,
                  cursor: "pointer",
                  background:
                    i === index ? "#fff" : "rgba(255,255,255,0.35)",
                  transition: "background 300ms",
                }}
              />
            ))}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 30,
          }}
        >
          <ScrollCue
            targetId="about"
            label="Scroll to content"
            preset="portfolio"
            className="glass-in"
          />
        </div>
      </section>
    </GlassLensCtx.Provider>
  )
}

const arrowStyle: CSSProperties = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  zIndex: 30,
  display: "grid",
  placeItems: "center",
  width: 48,
  height: 48,
  overflow: "hidden",
  borderRadius: 9999,
  border: 0,
  background: "transparent",
  cursor: "pointer",
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      aria-hidden
      className="glass-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,255,255,0.92)"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ position: "relative", width: 22, height: 22 }}
    >
      <path d={dir === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  )
}
