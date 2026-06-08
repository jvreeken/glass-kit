import { GlassLightProvider, GlassTunerProvider } from "glass-kit"
import "glass-kit/styles.css"
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
