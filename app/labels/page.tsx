'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Badge } from '@/components/ui'
import {
  QrCode,
  Printer,
  Download,
  Search,
  CheckSquare,
  Square,
  X,
  RectangleHorizontal,
  SquareIcon,
  Plus,
  Minus,
  Image as ImageIcon,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

type LabelSize = 'rectangular' | 'square'

export default function LabelsPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [labelSize, setLabelSize] = useState<LabelSize>('rectangular')
  const [searchTerm, setSearchTerm] = useState('')
  const [showLogo, setShowLogo] = useState(true)
  const [showSku, setShowSku] = useState(true)
  const [showName, setShowName] = useState(true)
  const [labelScale, setLabelScale] = useState(1)

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

  const { data: accountsResponse } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const response = await api.get('/accounts/accounts/')
      return response.data
    },
  })

  const accountData = (() => {
    const accounts = Array.isArray(accountsResponse)
      ? accountsResponse
      : accountsResponse?.results ?? []
    return accounts.length > 0 ? accounts[0] : null
  })()

  const filteredMaterials = materials.filter((m: any) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.sku && m.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  )

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
    if (selectedIds.length === filteredMaterials.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredMaterials.map((m: any) => m.id))
    }
  }

  const handlePrint = () => {
    if (selectedMaterials.length === 0) {
      toast.error('Selecciona al menos un material')
      return
    }

    const isRect = labelSize === 'rectangular'
    const cardW = isRect ? 360 : 240
    const cardH = isRect ? 180 : 240
    const qrSize = isRect ? 120 : 140
    const logoUrl = showLogo && accountData?.logo ? accountData.logo : ''

    const html = `
      <html>
        <head>
          <title>Etiquetas - Pack-a-Stock</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; background: white; }
            .grid {
              display: flex; flex-wrap: wrap; gap: 16px;
              justify-content: flex-start;
            }
            .label {
              width: ${cardW * labelScale}px;
              height: ${cardH * labelScale}px;
              border: 2px solid #333;
              border-radius: 8px;
              display: flex;
              ${isRect ? 'flex-direction: row;' : 'flex-direction: column;'}
              align-items: center;
              justify-content: center;
              padding: ${isRect ? '12px 16px' : '12px'};
              gap: ${isRect ? '16px' : '8px'};
              page-break-inside: avoid;
              overflow: hidden;
            }
            .qr-section { flex-shrink: 0; }
            .qr-section img { width: ${qrSize * labelScale}px; height: ${qrSize * labelScale}px; }
            .info-section { text-align: ${isRect ? 'left' : 'center'}; overflow: hidden; }
            .logo { max-height: ${30 * labelScale}px; max-width: ${80 * labelScale}px; object-fit: contain; margin-bottom: 4px; }
            .mat-name { font-size: ${12 * labelScale}px; font-weight: bold; color: #111; margin-bottom: 2px; }
            .mat-sku { font-size: ${10 * labelScale}px; color: #555; font-family: monospace; }
            @media print {
              body { padding: 0; }
              @page { margin: 10mm; }
            }
          </style>
        </head>
        <body>
          <div class="grid">
            ${selectedMaterials.map((m: any) => `
              <div class="label">
                <div class="qr-section">
                  ${m.qr_image ? `<img src="${m.qr_image}" alt="QR" />` : '<div style="width:120px;height:120px;border:2px dashed #ccc;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;">Sin QR</div>'}
                </div>
                <div class="info-section">
                  ${logoUrl ? `<img src="${logoUrl}" class="logo" alt="Logo" />` : ''}
                  ${showName ? `<div class="mat-name">${m.name}</div>` : ''}
                  ${showSku ? `<div class="mat-sku">${m.sku || m.qr_code}</div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
          <script>
            // Wait for images to load
            Promise.all(
              Array.from(document.images).map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
              })
            ).then(() => window.print());
          </script>
        </body>
      </html>
    `

    const win = window.open('', '_blank')
    if (!win) {
      toast.error('No se pudo abrir la ventana de impresion')
      return
    }
    win.document.write(html)
    win.document.close()
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <QrCode className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Etiquetas</h1>
              <p className="text-sm text-muted-foreground">
                Genera e imprime etiquetas con codigos QR
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handlePrint} disabled={selectedMaterials.length === 0}>
              <Printer className="h-5 w-5 mr-2" />
              Imprimir ({selectedMaterials.length})
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Panel - Config & Material Selection */}
          <div className="space-y-6">
            {/* Label Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Configuracion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Size */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Tamano de etiqueta
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={labelSize === 'rectangular' ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setLabelSize('rectangular')}
                      className="flex items-center gap-2"
                    >
                      <RectangleHorizontal className="h-4 w-4" />
                      Rectangular
                    </Button>
                    <Button
                      variant={labelSize === 'square' ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setLabelSize('square')}
                      className="flex items-center gap-2"
                    >
                      <SquareIcon className="h-4 w-4" />
                      Cuadrada
                    </Button>
                  </div>
                </div>

                {/* Scale */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Escala: {Math.round(labelScale * 100)}%
                  </label>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setLabelScale(s => Math.max(0.5, s - 0.1))}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={labelScale}
                      onChange={(e) => setLabelScale(parseFloat(e.target.value))}
                      className="flex-1"
                    />
                    <Button size="sm" variant="secondary" onClick={() => setLabelScale(s => Math.min(2, s + 0.1))}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Toggle options */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={showLogo} onChange={(e) => setShowLogo(e.target.checked)} className="rounded" />
                    <span className="text-sm text-foreground">Mostrar logo de empresa</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} className="rounded" />
                    <span className="text-sm text-foreground">Mostrar nombre</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={showSku} onChange={(e) => setShowSku(e.target.checked)} className="rounded" />
                    <span className="text-sm text-foreground">Mostrar codigo SKU</span>
                  </label>
                </div>

                {!accountData?.logo && showLogo && (
                  <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                    <p className="text-xs text-yellow-300">
                      No tienes un logo configurado. Sube uno en Configuracion para que aparezca en las etiquetas.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Material Selection */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Materiales</CardTitle>
                  <Button size="sm" variant="ghost" onClick={handleSelectAll}>
                    {selectedIds.length === filteredMaterials.length ? 'Quitar todo' : 'Seleccionar todo'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Buscar material..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="max-h-96 overflow-y-auto space-y-1">
                  {isLoading ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">Cargando...</div>
                  ) : filteredMaterials.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">No se encontraron materiales</div>
                  ) : (
                    filteredMaterials.map((m: any) => (
                      <button
                        key={m.id}
                        onClick={() => toggleSelect(m.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                          selectedIds.includes(m.id)
                            ? 'bg-purple-900/20 border border-purple-500/30'
                            : 'hover:bg-secondary/50'
                        }`}
                      >
                        {selectedIds.includes(m.id) ? (
                          <CheckSquare className="h-4 w-4 text-purple-400 flex-shrink-0" />
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{m.sku}</p>
                        </div>
                        {m.qr_image ? (
                          <QrCode className="h-4 w-4 text-green-400 flex-shrink-0" />
                        ) : (
                          <span className="text-xs text-muted-foreground">Sin QR</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Preview */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vista Previa</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedMaterials.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <QrCode className="h-16 w-16 mb-4 opacity-30" />
                    <p>Selecciona materiales para ver la vista previa</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-4">
                    {selectedMaterials.map((m: any) => (
                      <div
                        key={m.id}
                        className={`bg-white rounded-lg border-2 border-gray-800 flex items-center justify-center overflow-hidden ${
                          labelSize === 'rectangular'
                            ? 'flex-row gap-4 p-3'
                            : 'flex-col gap-2 p-3'
                        }`}
                        style={{
                          width: labelSize === 'rectangular' ? 360 * labelScale : 240 * labelScale,
                          height: labelSize === 'rectangular' ? 180 * labelScale : 240 * labelScale,
                        }}
                      >
                        {/* QR */}
                        <div className="flex-shrink-0">
                          {m.qr_image ? (
                            <img
                              src={m.qr_image}
                              alt="QR"
                              style={{
                                width: (labelSize === 'rectangular' ? 120 : 140) * labelScale,
                                height: (labelSize === 'rectangular' ? 120 : 140) * labelScale,
                              }}
                            />
                          ) : (
                            <div
                              className="border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs"
                              style={{
                                width: 120 * labelScale,
                                height: 120 * labelScale,
                              }}
                            >
                              Sin QR
                            </div>
                          )}
                        </div>
                        {/* Info */}
                        <div className={`overflow-hidden ${labelSize === 'square' ? 'text-center' : ''}`}>
                          {showLogo && accountData?.logo && (
                            <img
                              src={accountData.logo}
                              alt="Logo"
                              style={{ maxHeight: 30 * labelScale, maxWidth: 80 * labelScale, objectFit: 'contain', marginBottom: 4 }}
                            />
                          )}
                          {showName && (
                            <p className="text-gray-900 font-bold truncate" style={{ fontSize: 12 * labelScale }}>
                              {m.name}
                            </p>
                          )}
                          {showSku && (
                            <p className="text-gray-500 font-mono" style={{ fontSize: 10 * labelScale }}>
                              {m.sku || m.qr_code}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
