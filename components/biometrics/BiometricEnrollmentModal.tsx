'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Camera, CheckCircle, X, Trash2, ScanFace } from 'lucide-react'
import api from '@/lib/api'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const MAX_PHOTOS = 3

export default function BiometricEnrollmentModal({ isOpen, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const queryClient = useQueryClient()

  const [photos, setPhotos] = useState<string[]>([])
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  // Abrir cámara al montar
  useEffect(() => {
    if (!isOpen) return
    setPhotos([])
    setCameraReady(false)
    setCameraError(null)
    startCamera()
    return () => stopCamera()
  }, [isOpen])

  async function startCamera() {
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

  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current || photos.length >= MAX_PHOTOS) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    // Obtener base64 sin el data URL prefix
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    const b64 = dataUrl.split(',')[1]
    setPhotos((prev) => [...prev, b64])
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const enrollMutation = useMutation({
    mutationFn: async (images: string[]) => {
      const { data } = await api.post('/auth/biometrics/enroll/', { images })
      return data
    },
    onSuccess: (data) => {
      toast.success(`Rostro registrado con ${data.photos_used} foto(s)`)
      queryClient.invalidateQueries({ queryKey: ['biometric-status'] })
      stopCamera()
      onClose()
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || err.response?.data?.details?.[0] || 'Error al registrar el rostro'
      toast.error(msg)
    },
  })

  function handleClose() {
    stopCamera()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-card border-2 border-border shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
              <ScanFace className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Registro Facial</h2>
              <p className="text-xs text-muted-foreground">Captura {MAX_PHOTOS} fotos para registrar tu rostro</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-secondary/40 rounded-xl transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-4">
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

            {/* Overlay de guía */}
            {cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-44 h-56 border-2 border-primary/60 rounded-full opacity-50" />
              </div>
            )}
          </div>

          {/* Botón capturar */}
          <button
            onClick={capturePhoto}
            disabled={!cameraReady || photos.length >= MAX_PHOTOS}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground font-medium rounded-xl transition-colors"
          >
            <Camera className="h-4 w-4" />
            {photos.length >= MAX_PHOTOS ? 'Fotos completas' : `Capturar foto (${photos.length}/${MAX_PHOTOS})`}
          </button>

          {/* Miniaturas */}
          {photos.length > 0 && (
            <div className="flex gap-3">
              {photos.map((b64, i) => (
                <div key={i} className="relative flex-1">
                  <img
                    src={`data:image/jpeg;base64,${b64}`}
                    alt={`Foto ${i + 1}`}
                    className="w-full aspect-square object-cover rounded-xl border-2 border-green-500/40"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                  <button
                    onClick={() => removePhoto(i)}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <div className="absolute bottom-1 left-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-md font-medium">
                    {i + 1}
                  </div>
                </div>
              ))}
              {/* Slots vacíos */}
              {Array.from({ length: MAX_PHOTOS - photos.length }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex-1 aspect-square rounded-xl border-2 border-dashed border-border flex items-center justify-center"
                >
                  <Camera className="h-5 w-5 text-muted-foreground/30" />
                </div>
              ))}
            </div>
          )}

          {/* Botón registrar */}
          <button
            onClick={() => enrollMutation.mutate(photos)}
            disabled={photos.length === 0 || enrollMutation.isPending}
            className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
          >
            <CheckCircle className="h-4 w-4" />
            {enrollMutation.isPending ? 'Registrando...' : 'Registrar rostro'}
          </button>
        </div>
      </div>
    </div>
  )
}
