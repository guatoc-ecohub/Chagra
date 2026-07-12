interface Window {
  webkitAudioContext: typeof AudioContext;
}

interface Navigator {
  getBattery?: () => Promise<{
    level: number
    charging: boolean
    addEventListener: (type: string, cb: () => void) => void
    removeEventListener: (type: string, cb: () => void) => void
  }>
  brave?: { isBrave?: () => boolean }
  connection?: { effectiveType?: string }
}
