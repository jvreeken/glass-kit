"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

export const DEFAULT_LIGHT = 315

// The single global light-source angle (degrees, 0 = top, clockwise) every glass
// surface reads for its specular highlight. Only its consumers (the surfaces)
// re-render when it changes — not the whole tree.
const LightAngleCtx = createContext<number>(DEFAULT_LIGHT)
export const useGlassLight = () => useContext(LightAngleCtx)

export type GlassLightControl = {
  /** The "normal" angle the light rests at / springs back to (from settings). */
  base: number
  setBase: (deg: number) => void
  perm: "unsupported" | "prompt" | "granted" | "denied"
  sensorOn: boolean
  /** Ask for the device-orientation sensor (iOS needs a user gesture). */
  requestSensor: () => void
}
const LightControlCtx = createContext<GlassLightControl | null>(null)
export const useGlassLightControl = () => useContext(LightControlCtx)

const RAD = Math.PI / 180

// Tilt response — tweak on a device. The light EASES toward the phone's tilt
// direction (it follows the lean and stays there, rather than springing back to a
// baseline), and only drifts home toward `base` when the phone is resting flat.
const FOLLOW = 0.12 // ease toward the tilt direction per event (higher = snappier)
const DEADZONE = 10 // tilt (deg from flat) below which it eases back to the base
const HOLD_MS = 1100 // hold a tilt steady this long → it becomes the new baseline
const HOLD_TOLERANCE = 12 // deg of wobble allowed while "holding" a direction

/** Shortest signed delta from a to b on a 0–360 ring. */
const ring = (a: number, b: number) => ((b - a + 540) % 360) - 180

/** Device tilt → light angle (0 = top, clockwise). `gamma` is left/right tilt,
 *  `beta` is front/back. Flip a sign here if it reads reversed on a device. */
function tiltToAngle(beta: number, gamma: number): number {
  const a = Math.atan2(gamma, beta) / RAD
  return ((a % 360) + 360) % 360
}

type DOEPerm = { requestPermission?: () => Promise<string> }

/** Owns the global light angle: a manual base + the device-orientation sensor
 *  (with the iOS permission flow + spring-back). Wrap the app once. */
export function GlassLightProvider({ children }: { children: ReactNode }) {
  const [angle, setAngle] = useState(DEFAULT_LIGHT)
  const [base, setBase] = useState(DEFAULT_LIGHT)
  const [perm, setPerm] = useState<GlassLightControl["perm"]>("prompt")
  const [sensorOn, setSensorOn] = useState(false)
  const [shimmer, setShimmer] = useState(0) // transient 0→360° sweep, on top of base/tilt

  const sensorOnRef = useRef(false)
  const listeningRef = useRef(false)
  const angleRef = useRef(DEFAULT_LIGHT) // precise (unrounded) angle
  const baseRef = useRef(base)
  baseRef.current = base
  const heldRef = useRef(DEFAULT_LIGHT) // the tilt direction currently being held
  const heldSinceRef = useRef(0) // when that hold began (ms)
  const adoptedRef = useRef(false) // already adopted this hold as the baseline?

  // Each orientation event eases the angle toward the phone's tilt DIRECTION, so the
  // light follows the lean and holds there — only easing back toward `base` when the
  // phone is near flat (within DEADZONE).
  //
  // Self-calibrating baseline: hold a tilt steady (within HOLD_TOLERANCE) for HOLD_MS
  // and that settled angle becomes the new `base`, so the light rests where you
  // actually hold the phone — and eases there, not to some fixed angle, when it
  // later goes flat.
  const onOrient = useCallback((e: DeviceOrientationEvent) => {
    if (e.beta == null || e.gamma == null) return
    if (!sensorOnRef.current) {
      sensorOnRef.current = true
      setSensorOn(true)
    }
    const mag = Math.hypot(e.beta, e.gamma) // how far from flat the phone is
    const flat = mag < DEADZONE
    const tilt = flat ? baseRef.current : tiltToAngle(e.beta, e.gamma)
    angleRef.current =
      (angleRef.current + ring(angleRef.current, tilt) * FOLLOW + 360) % 360

    const now = performance.now()
    if (!flat && Math.abs(ring(heldRef.current, tilt)) < HOLD_TOLERANCE) {
      if (!adoptedRef.current && now - heldSinceRef.current > HOLD_MS) {
        adoptedRef.current = true
        const b = Math.round(angleRef.current) % 360
        setBase((cur) => (Math.abs(ring(cur, b)) < 2 ? cur : b))
      }
    } else {
      heldRef.current = tilt // started leaning a new way (or went flat) — restart
      heldSinceRef.current = now
      adoptedRef.current = false
    }

    const rounded = Math.round(angleRef.current) % 360
    setAngle((a) => (a === rounded ? a : rounded))
  }, [])

  const startListening = useCallback(() => {
    if (listeningRef.current) return
    listeningRef.current = true
    window.addEventListener("deviceorientation", onOrient)
  }, [onOrient])

  const requestSensor = useCallback(() => {
    const DOE = window.DeviceOrientationEvent as unknown as DOEPerm | undefined
    if (!DOE) return setPerm("unsupported")
    if (typeof DOE.requestPermission === "function") {
      DOE.requestPermission()
        .then((res) => {
          const granted = res === "granted"
          setPerm(granted ? "granted" : "denied")
          if (granted) startListening()
        })
        .catch(() => setPerm("denied"))
    } else {
      setPerm("granted")
      startListening()
    }
  }, [startListening])

  // Platforms without a permission gate (Android/desktop) start immediately; iOS
  // waits for a user gesture — the first click on any glass control requests it.
  useEffect(() => {
    const DOE = window.DeviceOrientationEvent as unknown as DOEPerm | undefined
    if (!DOE) {
      setPerm("unsupported")
      return
    }
    if (typeof DOE.requestPermission === "function") {
      const onClick = (e: MouseEvent) => {
        const ctrl = (e.target as HTMLElement | null)?.closest("button, a")
        if (ctrl?.querySelector(".glass-surface")) {
          window.removeEventListener("click", onClick, true)
          requestSensor()
        }
      }
      window.addEventListener("click", onClick, true)
      return () => window.removeEventListener("click", onClick, true)
    }
    setPerm("granted")
    startListening()
    return () => {
      listeningRef.current = false
      window.removeEventListener("deviceorientation", onOrient)
    }
  }, [requestSensor, startListening, onOrient])

  // When the sensor isn't driving it, sit at the manual base.
  useEffect(() => {
    if (!sensorOn) {
      setAngle(base)
      angleRef.current = base
    }
  }, [base, sensorOn])

  // A one-shot 360° sweep of the light angle: the specular highlight whips all the
  // way around every glass rim, so the whole UI shimmers. Layered on top of the
  // resting base/tilt angle, it returns to rest (360° ≡ 0). Fired on load and on
  // any button/link click.
  const shimmerRaf = useRef(0)
  const triggerShimmer = useCallback(() => {
    cancelAnimationFrame(shimmerRaf.current)
    const start = performance.now()
    const DUR = 700
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DUR)
      const eased = 1 - Math.pow(1 - t, 3) // ease-out: a quick whip that settles
      setShimmer((eased * 360) % 360)
      if (t < 1) shimmerRaf.current = requestAnimationFrame(tick)
      else setShimmer(0)
    }
    shimmerRaf.current = requestAnimationFrame(tick)
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement | null)?.closest("button, a")) triggerShimmer()
    }
    window.addEventListener("click", onClick)
    const t = window.setTimeout(triggerShimmer, 450) // after the controls fade in
    return () => {
      window.removeEventListener("click", onClick)
      clearTimeout(t)
      cancelAnimationFrame(shimmerRaf.current)
    }
  }, [triggerShimmer])

  // Memoized so an angle change doesn't churn the control consumers (the tuner).
  const control = useMemo<GlassLightControl>(
    () => ({ base, setBase, perm, sensorOn, requestSensor }),
    [base, perm, sensorOn, requestSensor],
  )

  return (
    <LightAngleCtx.Provider value={(angle + shimmer) % 360}>
      <LightControlCtx.Provider value={control}>
        {children}
      </LightControlCtx.Provider>
    </LightAngleCtx.Provider>
  )
}
