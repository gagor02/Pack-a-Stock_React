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

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
  const mediaBase = apiBase.replace(/\/api\/?$/, '')

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
            .card { border: 1px solid #e5e7eb; padding: 12px; text-align: center; }
            img { max-width: 100%; height: auto; }
            .name { margin-top: 8px; font-size: 12px; }
          </style>
        </head>
        <body>
          <h2>Etiquetas QR</h2>
          <div class="grid">
            ${selectedMaterials
              .map((m: any) => {
                const qrUrl = m.qr_image ? (m.qr_image.startsWith('http') ? m.qr_image : `${mediaBase}${m.qr_image}`) : ''
                return `
                  <div class="card">
                    ${qrUrl ? `<img src="${qrUrl}" />` : '<div>Sin QR</div>'}
                    <div class="name">${m.name}</div>
                    <div class="name">${m.qr_code || ''}</div>
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
            const qrUrl = material.qr_image
              ? material.qr_image.startsWith('http')
                ? material.qr_image
                : `${mediaBase}${material.qr_image}`
              : ''

            return (
              <div key={material.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-gray-900">{material.name}</div>
                    <div className="text-sm text-gray-600">{material.qr_code}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(material.id)}
                    onChange={() => toggleSelect(material.id)}
                  />
                </div>
                <div className="mt-3">
                  {qrUrl ? (
                    <img src={qrUrl} alt={material.name} className="w-32 h-32 object-contain" />
                  ) : (
                    <div className="text-sm text-gray-500">Sin QR</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
