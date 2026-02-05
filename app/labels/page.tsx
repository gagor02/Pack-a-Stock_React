'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function LabelsPage() {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [previewMaterial, setPreviewMaterial] = useState<any>(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
    }
  }, [router])

  const { data: materialsResponse = [], isLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: async () => {
      const response = await api.get('/materials/materials/')
      return response.data
    },
  })

  const materials = Array.isArray(materialsResponse)
    ? materialsResponse
    : materialsResponse?.results ?? []

  const selectedMaterials = useMemo(
    () => materials.filter((m: any) => selectedIds.includes(m.id)),
    [materials, selectedIds]
  )

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedIds.length === materials.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(materials.map((m: any) => m.id))
    }
  }

  const downloadQR = async (material: any) => {
    if (!material.qr_image) {
      toast.error('Este material no tiene código QR')
      return
    }

    try {
      const response = await fetch(material.qr_image)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${material.qr_code}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success('QR descargado exitosamente')
    } catch (error) {
      toast.error('Error al descargar el QR')
    }
  }

  const handlePrint = () => {
    if (selectedMaterials.length === 0) {
      toast.error('Selecciona al menos un material')
      return
    }

    const html = `
      <html>
        <head>
          <title>Etiquetas QR</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
            .card { border: 1px solid #e5e7eb; padding: 12px; text-align: center; page-break-inside: avoid; }
            img { max-width: 100%; height: auto; }
            .name { margin-top: 8px; font-size: 12px; font-weight: bold; }
            .code { font-size: 10px; color: #666; }
          </style>
        </head>
        <body>
          <h2>Etiquetas QR</h2>
          <div class="grid">
            ${selectedMaterials
              .map((m: any) => {
                const qrUrl = m.qr_image || ''
                return `
                  <div class="card">
                    ${qrUrl ? `<img src="${qrUrl}" />` : '<div style="height: 200px; display: flex; align-items: center; justify-content: center; border: 2px dashed #ccc;">Sin QR</div>'}
                    <div class="name">${m.name}</div>
                    <div class="code">${m.qr_code || ''}</div>
                  </div>
                `
              })
              .join('')}
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `

    const win = window.open('', '_blank')
    if (!win) {
      toast.error('No se pudo abrir la ventana de impresión')
      return
    }
    win.document.write(html)
    win.document.close()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
              ← Volver
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Etiquetas QR</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSelectAll}
              className="px-3 py-2 rounded-lg border"
            >
              {selectedIds.length === materials.length ? 'Quitar selección' : 'Seleccionar todo'}
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white"
            >
              Generar PDF / Imprimir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading && <div>Cargando materiales...</div>}
        {!isLoading && materials.length === 0 && (
          <div className="text-gray-600">No hay materiales disponibles.</div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map((material: any) => {
            const hasQR = !!material.qr_image

            return (
              <div key={material.id} className="bg-white rounded-lg shadow hover:shadow-lg transition">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{material.name}</div>
                      <div className="text-sm text-gray-600 font-mono">{material.qr_code}</div>
                      {material.category_detail?.name && (
                        <div className="text-xs text-gray-500 mt-1">
                          {material.category_detail.name}
                        </div>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(material.id)}
                      onChange={() => toggleSelect(material.id)}
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                  </div>

                  <div className="mt-4">
                    {hasQR ? (
                      <div className="space-y-3">
                        <div 
                          className="cursor-pointer group"
                          onClick={() => setPreviewMaterial(material)}
                        >
                          <img 
                            src={material.qr_image} 
                            alt={material.name} 
                            className="w-full h-48 object-contain bg-gray-50 rounded-lg border-2 border-gray-200 group-hover:border-blue-500 transition"
                          />
                          <p className="text-xs text-center text-gray-500 mt-2 group-hover:text-blue-600">
                            Clic para ver en grande
                          </p>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => setPreviewMaterial(material)}
                            className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm font-medium flex items-center justify-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Ver
                          </button>
                          <button
                            onClick={() => downloadQR(material)}
                            className="flex-1 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition text-sm font-medium flex items-center justify-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Descargar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="h-48 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                        <div className="text-center">
                          <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <p className="text-sm text-gray-500 mt-2">Sin código QR</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* Modal de previsualización */}
      {previewMaterial && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewMaterial(null)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{previewMaterial.name}</h3>
                <p className="text-sm text-gray-600 font-mono">{previewMaterial.qr_code}</p>
              </div>
              <button
                onClick={() => setPreviewMaterial(null)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex justify-center mb-6">
              <img 
                src={previewMaterial.qr_image} 
                alt={previewMaterial.name}
                className="max-w-full h-auto border-2 border-gray-200 rounded-lg"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => downloadQR(previewMaterial)}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Descargar QR
              </button>
              <button
                onClick={() => setPreviewMaterial(null)}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
