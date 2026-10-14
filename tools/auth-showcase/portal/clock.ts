import { installClock } from '../shared/clock.ts'
import { TODAY_MS } from '../shared/sunstate.ts'

// Imported first by main.tsx, so no app module reads the real date before this runs.
installClock(TODAY_MS)
