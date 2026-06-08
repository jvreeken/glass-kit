import { GlassLightProvider, GlassTunerProvider } from "glass-lens-react"
import "glass-lens-react/styles.css"
import { Header } from "./Header"
import { Hero } from "./Hero"
import { Showcase } from "./Showcase"

export function App() {
  return (
    <GlassLightProvider>
      <GlassTunerProvider>
        <Header />
        <Hero />
        <Showcase />
      </GlassTunerProvider>
    </GlassLightProvider>
  )
}
