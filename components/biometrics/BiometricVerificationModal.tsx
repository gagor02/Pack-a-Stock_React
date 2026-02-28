'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, Fingerprint, X, AlertTriangle, CheckCircle } from 'lucide-react'
import api from '@/lib/api'

interface Props {
  isOpen: boolean
  nonConsumableCount: number
  onVerified: () => void
  onClose: () => void
}

const MAX_ATTEMPTS = 3

export default function BiometricVerificationModal({
  isOpen,
  nonConsumableCount,
  onVerified,
  onClose,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [lastError, setLastError] = useState<string | null>(null)
  const [lastSimilarity, setLastSimilarity] = useState<number | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setAttempts(0)
    setLastError(null)
    setLastSimilarity(null)
    startCamera()
    return () => stopCamera()
  }, [isOpen])

  async function startCamera() {
    setCameraReady(false)
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => setCameraReady(true)
      }
    } catch {
      setCameraError('No se pudo acceder a la cámara. Verifica los permisos del navegador.')
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  async function handleVerify() {
    if (!videoRef.current || !canvasRef.current || loading) return

    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    const b64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1]

    setLoading(true)
    setLastError(null)

    try {
      const { data } = await api.post('/auth/biometrics/verify/', { image: b64 })

      if (data.match) {
        stopCamera()
        onVerified()
      } else {
        const newAttempts = attempts + 1
        setAttempts(newAttempts)
        setLastSimilarity(data.similarity)
        setLastError(
          newAttempts >= MAX_ATTEMPTS
            ? 'Se alcanzó el límite de intentos. La operación fue cancelada.'
            : `No se pudo verificar tu identidad (similitud: ${(data.similarity * 100).toFixed(0)}%). Intenta de nuevo.`,
        )
        if (newAttempts >= MAX_ATTEMPTS) {
          setTimeout(() => {
            stopCamera()
            onClose()
          }, 2500)
        }
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Error al verificar el rostro'
      setLastError(msg)
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    stopCamera()
    onClose()
  }

  if (!isOpen) return null

  const attemptsLeft = MAX_ATTEMPTS - attempts

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-card border-2 border-border shadow-2xl rounded-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <Fingerprint className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Verificación requerida</h2>
              <p className="text-xs text-muted-foreground">
                Esta operación incluye {nonConsumableCount} materiales no consumibles
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-secondary/40 rounded-xl transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Mira a la cámara y presiona <strong className="text-foreground">Verificar</strong> para confirmar tu identidad.
          </p>

          {/* Webcam */}
          <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            <canvas ref={canvasRef} className="hidden" />

            {!cameraReady && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white/60 text-sm">Iniciando cámara...</div>
              </div>
            )}
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <p className="text-red-400 text-sm text-center">{cameraError}</p>
              </div>
            )}

            {/* Guía de rostro */}
            {cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-40 h-52 border-2 border-amber-400/60 rounded-full opacity-60" />
              </div>
            )}
          </div>

          {/* Error / resultado */}
          {lastError && (
            <div className={`flex items-start gap-2 p-3 rounded-xl border text-sm ${
              attempts >= MAX_ATTEMPTS
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}>
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{lastError}</span>
            </div>
          )}

          {/* Intentos restantes */}
          {attempts > 0 && attempts < MAX_ATTEMPTS && (
            <p className="text-xs text-muted-foreground text-center">
              Intentos restantes: <span className="font-bold text-amber-400">{attemptsLeft}</span>
            </p>
          )}

          {/* Botón verificar */}
          <button
            onClick={handleVerify}
            disabled={!cameraReady || loading || attempts >= MAX_ATTEMPTS}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-base"
          >
            <Camera className="h-4 w-4" />
            {loading ? 'Verificando...' : 'Verificar identidad'}
          </button>

          <button
            onClick={handleClose}
            className="w-full py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/40 rounded-xl transition-colors"
          >
            Cancelar operación
          </button>
        </div>
      </div>
    </div>
  )
}
