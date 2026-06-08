import { useEffect, useState, type CSSProperties } from "react"
import { GlassSurface } from "glass-lens-react"

const NAV = [
  { label: "GitHub", href: "https://github.com/jvreeken/glass-kit" },
  { label: "npm", href: "https://www.npmjs.com/package/glass-lens-react" },
  { label: "Demo source", href: "https://github.com/jvreeken/glass-kit/tree/main/examples/demo" },
]

export function Header() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  const dark = scrolled && !open
  const fg = dark ? "#1a1a2e" : "#fff"

  return (
    <>
      <header
        // The solid scrolled bar paints over the hero video → an occluder, so the
        // standalone menu lens lets go promptly as you scroll instead of refracting
        // through the half-faded bar.
        data-glass-occluder={dark ? "" : undefined}
        style={{
          position: "fixed",
          insetInline: 0,
          top: 0,
          zIndex: 50,
          transition: "background 300ms",
          background: dark
            ? "rgba(232,233,238,0.92)"
            : "linear-gradient(to bottom, rgba(0,0,0,0.32), transparent)",
          backdropFilter: dark ? "blur(8px)" : undefined,
          WebkitBackdropFilter: dark ? "blur(8px)" : undefined,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
          }}
        >
          <a
            href="https://github.com/jvreeken/glass-kit"
            style={{
              fontWeight: 800,
              fontSize: 20,
              letterSpacing: "-0.02em",
              color: fg,
              textDecoration: "none",
              transition: "color 300ms",
            }}
          >
            glass-lens<span style={{ opacity: 0.55 }}>-react</span>
          </a>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="glass-control glass-in"
            style={menuBtn}
          >
            {/* `standalone` ⇒ the package self-manages a WebGL lens over the hero
                video, and frosts over the bar / open overlay automatically. */}
            <GlassSurface preset="hero" standalone reveal />
            <span
              className={dark ? undefined : "glass-icon"}
              style={{ position: "relative", display: "grid", placeItems: "center" }}
            >
              <MenuIcon open={open} color={open ? "#fff" : fg} />
            </span>
          </button>
        </div>
      </header>

      {/* Full-screen overlay menu */}
      <div
        data-glass-occluder
        aria-hidden={!open}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 40,
          transition: "opacity 300ms",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          background:
            "radial-gradient(60rem 40rem at 70% 20%, #2a1a4e 0%, transparent 60%), #12122a",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <nav style={{ display: "flex", flexDirection: "column", gap: 6, textAlign: "center" }}>
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              style={{
                color: "#fff",
                textDecoration: "none",
                fontSize: "clamp(1.8rem, 7vw, 3rem)",
                fontWeight: 200,
                letterSpacing: "0.06em",
                padding: "8px 0",
                opacity: 0.85,
              }}
            >
              {item.label}
            </a>
          ))}
          <code
            style={{
              marginTop: 24,
              color: "rgba(255,255,255,0.6)",
              fontSize: 14,
              letterSpacing: "0.05em",
            }}
          >
            npm i glass-lens-react
          </code>
        </nav>
      </div>
    </>
  )
}

const menuBtn: CSSProperties = {
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
}

function MenuIcon({ open, color }: { open: boolean; color: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={22}
      height={22}
      fill="none"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
      aria-hidden
    >
      {open ? (
        <path d="M6 6l12 12M18 6L6 18" />
      ) : (
        <path d="M3 6h18M3 12h18M3 18h18" />
      )}
    </svg>
  )
}
