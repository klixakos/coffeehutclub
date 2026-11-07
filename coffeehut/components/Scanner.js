'use client'
import { useEffect, useRef } from 'react'
import jsQR from 'jsqr'

export default function Scanner({ onCode, onError }) {
  const video = useRef(null)
  const canvas = useRef(null)
  const cb = useRef({ onCode, onError })
  cb.current = { onCode, onError }

  useEffect(() => {
    let stream, raf, stopped = false, last = 0
    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } }, audio: false,
        })
        const v = video.current
        v.srcObject = stream
        v.setAttribute('playsinline', 'true')
        await v.play()
        const tick = (t) => {
          if (stopped) return
          if (t - last > 150 && v.readyState === 4 && v.videoWidth) {
            last = t
            const scale = Math.min(1, 640 / v.videoWidth)
            const w = Math.round(v.videoWidth * scale), h = Math.round(v.videoHeight * scale)
            const c = canvas.current
            c.width = w; c.height = h
            const ctx = c.getContext('2d', { willReadFrequently: true })
            ctx.drawImage(v, 0, 0, w, h)
            const img = ctx.getImageData(0, 0, w, h)
            const code = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' })
            if (code && code.data.startsWith('CH1:')) {
              stopped = true
              cb.current.onCode(code.data.slice(4))
              return
            }
          }
          raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      } catch {
        cb.current.onError?.('Δεν δόθηκε πρόσβαση στην κάμερα. Έλεγξε τις άδειες του browser ή ψάξε με κινητό.')
      }
    }
    start()
    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return (
    <div className="scanner">
      <video ref={video} muted playsInline />
      <canvas ref={canvas} hidden />
      <div className="frame" aria-hidden="true" />
    </div>
  )
}
