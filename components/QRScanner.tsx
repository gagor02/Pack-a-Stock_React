'use client'

import { useRef, useState } from 'react'

interface QRScannerProps {
  onScan: (data: string) => void
  onClose: () => void
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [error, setError] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setIsProcessing(true)

    try {
      // Cargar jsQR dinámicamente
      const jsQR = (await import('jsqr')).default
      
      // Leer la imagen
      const image = new Image()
      const reader = new FileReader()

      reader.onload = (event) => {
        image.onload = () => {
          const canvas = canvasRef.current
          if (!canvas) return

          const ctx = canvas.getContext('2d')
          if (!ctx) return

          canvas.width = image.width
          canvas.height = image.height
          ctx.drawImage(image, 0, 0)

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, imageData.width, imageData.height)

          setIsProcessing(false)

          if (code) {
            onScan(code.data)
            onClose()
          } else {
            setError('No se pudo detectar un código QR en la imagen. Intenta con otra imagen.')
          }
        }

        if (event.target?.result) {
          image.src = event.target.result as string
        }
      }

      reader.readAsDataURL(file)
    } catch (err: any) {
      setError('Error al procesar la imagen: ' + err.message)
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Escanear Código QR
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={isProcessing}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="w-full py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition flex flex-col items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <svg className="w-12 h-12 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm text-gray-600">Procesando imagen...</span>
                </>
              ) : (
                <>
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-gray-600">
                    Haz clic para subir una imagen con código QR
                  </span>
                </>
              )}
            </button>
            
            {/* Canvas oculto para procesamiento */}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>
      </div>
    </div>
  )
}
