'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { QRCodeSVG } from 'qrcode.react'
import api from '@/lib/api'
import {
  X, Package, Search, RefreshCw, BookOpen,
  CheckCircle, AlertTriangle, MapPin, Tag,
  ChevronLeft,
} from 'lucide-react'

type StatusFilter = 'all' | 'available' | 'in_use' | 'low_stock'

function useNow() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

function StatusPill({ status, lowStock }: { status: string; lowStock?: boolean }) {
  if (lowStock) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400">
        <AlertTriangle className="h-3 w-3" />Stock bajo
      </span>
    )
  }
  if (status === 'available') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400">
        <CheckCircle className="h-3 w-3" />Disponible
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/20 text-sky-400">
      <Package className="h-3 w-3" />En uso
    </span>
  )
}

function MaterialCard({ mat, onClick }: { mat: any; onClick: () => void }) {
  const imgSrc = mat.image || mat.image_url || null

  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-violet-500/40 hover:bg-white/8 hover:shadow-xl hover:shadow-violet-500/10 transition-all duration-200 text-left"
    >
      {/* Image area */}
      <div className="relative w-full aspect-square bg-white/5 flex items-center justify-center overflow-hidden">
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt={mat.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-white/20">
            <Package className="h-12 w-12" />
          </div>
        )}
        {/* Status overlay badge */}
        <div className="absolute top-2 right-2">
          <StatusPill status={mat.status} lowStock={mat.is_low_stock} />
        </div>
      </div>

      {/* Info area */}
      <div className="flex-1 p-3 flex flex-col gap-2">
        <div>
          <h3 className="font-bold text-white text-sm leading-tight line-clamp-2">{mat.name}</h3>
          {mat.sku && (
            <p className="text-xs text-white/30 font-mono mt-0.5">{mat.sku}</p>
          )}
        </div>

        {(mat.category_detail?.name || mat.category_name) && (
          <div className="flex items-center gap-1.5 text-xs text-white/40">
            <Tag className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{mat.category_detail?.name ?? mat.category_name}</span>
          </div>
        )}

        {(mat.location_detail?.name || mat.location_name) && (
          <div className="flex items-center gap-1.5 text-xs text-white/40">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{mat.location_detail?.name ?? mat.location_name}</span>
          </div>
        )}

        <div className="flex items-center justify-between mt-auto pt-1">
          <span className="text-xs text-white/40">
            {mat.available_quantity ?? 0}<span className="text-white/20">/{mat.quantity ?? 0}</span>
          </span>
          {/* Tiny QR preview */}
          {mat.qr_code && (
            <div className="bg-white p-1 rounded-md">
              <QRCodeSVG value={mat.qr_code} size={32} />
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

function MaterialDetail({ mat, onClose }: { mat: any; onClose: () => void }) {
  const imgSrc = mat.image || mat.image_url || null

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[10001] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[#0f0f22] border border-white/15 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/60">
        {/* Detail header */}
        <div className="flex items-center justify-between px-8 pt-6 pb-4 border-b border-white/10">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm"
          >
            <ChevronLeft className="h-4 w-4" />
            Volver
          </button>
          <StatusPill status={mat.status} lowStock={mat.is_low_stock} />
        </div>

        <div className="p-8 flex flex-col md:flex-row gap-8">
          {/* Left: image + QR */}
          <div className="flex flex-col items-center gap-5 md:w-56 flex-shrink-0">
            {imgSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imgSrc}
                alt={mat.name}
                className="w-full md:w-52 aspect-square object-cover rounded-2xl border border-white/10"
              />
            ) : (
              <div className="w-full md:w-52 aspect-square rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Package className="h-16 w-16 text-white/15" />
              </div>
            )}

            {mat.qr_code && (
              <div className="flex flex-col items-center gap-2">
                <div className="bg-white p-3 rounded-2xl shadow-lg shadow-black/30">
                  <QRCodeSVG value={mat.qr_code} size={140} />
                </div>
                <p className="text-xs text-white/30 font-mono text-center break-all max-w-[10rem]">{mat.qr_code}</p>
              </div>
            )}
          </div>

          {/* Right: info */}
          <div className="flex-1 space-y-5">
            <div>
              <h2 className="text-2xl font-black text-white leading-tight">{mat.name}</h2>
              {mat.sku && <p className="text-sm text-white/30 font-mono mt-1">{mat.sku}</p>}
            </div>

            {mat.description && (
              <p className="text-sm text-white/50 leading-relaxed">{mat.description}</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <InfoBlock label="Disponibles" value={`${mat.available_quantity ?? 0} / ${mat.quantity ?? 0}`} highlight={mat.is_low_stock ? 'amber' : 'green'} />
              <InfoBlock label="Estado" value={mat.status === 'available' ? 'Disponible' : 'En uso'} />
              {(mat.category_detail?.name || mat.category_name) && (
                <InfoBlock label="Categoría" value={mat.category_detail?.name ?? mat.category_name} />
              )}
              {(mat.location_detail?.name || mat.location_name) && (
                <InfoBlock label="Ubicación" value={mat.location_detail?.name ?? mat.location_name} />
              )}
              {mat.serial_number && (
                <InfoBlock label="N° Serie" value={mat.serial_number} />
              )}
              {mat.barcode && (
                <InfoBlock label="Código de barras" value={mat.barcode} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoBlock({ label, value, highlight }: { label: string; value: string; highlight?: 'green' | 'amber' }) {
  const valueClass = highlight === 'green'
    ? 'text-emerald-400 font-bold'
    : highlight === 'amber'
    ? 'text-amber-400 font-bold'
    : 'text-white font-semibold'

  return (
    <div className="bg-white/5 rounded-xl px-4 py-3">
      <p className="text-xs text-white/30 font-medium uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-sm ${valueClass}`}>{value}</p>
    </div>
  )
}

export default function CatalogMode() {
  const { catalogMode, setCatalogMode } = useUIStore()
  const { user } = useAuthStore()
  const now = useNow()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selected, setSelected] = useState<any | null>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const { data: matsRes, refetch } = useQuery({
    queryKey: ['catalog-materials'],
    queryFn: async () => (await api.get('/materials/materials/?page_size=200')).data,
    refetchInterval: 30000,
    enabled: catalogMode,
  })

  const materials: any[] = Array.isArray(matsRes) ? matsRes : matsRes?.results ?? []

  const handleRefresh = useCallback(() => {
    refetch()
    setLastRefresh(new Date())
  }, [refetch])

  const filtered = useMemo(() => {
    return materials.filter((m) => {
      const q = search.toLowerCase()
      const matchesSearch =
        !q ||
        m.name?.toLowerCase().includes(q) ||
        m.sku?.toLowerCase().includes(q) ||
        m.category_detail?.name?.toLowerCase().includes(q) ||
        m.category_name?.toLowerCase().includes(q) ||
        m.location_detail?.name?.toLowerCase().includes(q)

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'available' && m.status === 'available') ||
        (statusFilter === 'in_use' && m.status !== 'available') ||
        (statusFilter === 'low_stock' && m.is_low_stock)

      return matchesSearch && matchesStatus
    })
  }, [materials, search, statusFilter])

  // ESC to close (when no detail modal open)
  useEffect(() => {
    if (!catalogMode) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !selected) setCatalogMode(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [catalogMode, setCatalogMode, selected])

  // Fullscreen
  useEffect(() => {
    if (catalogMode) {
      document.documentElement.requestFullscreen?.().catch(() => {})
    } else {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    }
  }, [catalogMode])

  if (!catalogMode) return null

  const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const accountName = (user as any)?.account?.name ?? 'Pack-a-Stock'

  const filterTabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'all', label: 'Todos', count: materials.length },
    { key: 'available', label: 'Disponibles', count: materials.filter(m => m.status === 'available').length },
    { key: 'in_use', label: 'En uso', count: materials.filter(m => m.status !== 'available').length },
    { key: 'low_stock', label: 'Stock bajo', count: materials.filter(m => m.is_low_stock).length },
  ]

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0a1a] text-white flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-10 py-5 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-600 to-purple-500 shadow-lg shadow-violet-500/30">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight">{accountName} · Catálogo</div>
            <div className="text-sm text-white/50 capitalize">{dateStr}</div>
          </div>
        </div>

        <div className="tabular-nums text-4xl font-black tracking-tight">{timeStr}</div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm text-white/70 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {lastRefresh.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
          </button>
          <button
            onClick={() => setCatalogMode(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-red-500/30 text-sm text-white/70 hover:text-white transition-colors"
            title="Salir (ESC)"
          >
            <X className="h-4 w-4" />
            Salir
          </button>
        </div>
      </div>

      {/* Search + filters */}
      <div className="px-10 py-4 flex flex-col sm:flex-row gap-3 flex-shrink-0 border-b border-white/5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <input
            type="text"
            placeholder="Buscar material, SKU, categoría, ubicación..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-white/5 border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 focus:bg-white/8 transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                statusFilter === tab.key
                  ? 'bg-violet-600 text-white'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
              }`}
            >
              {tab.label}
              <span className="ml-2 text-xs opacity-60">{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-10 py-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Package className="h-16 w-16 text-white/10" />
            <p className="text-xl text-white/30 font-medium">Sin materiales</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filtered.map((mat) => (
              <MaterialCard key={mat.id} mat={mat} onClick={() => setSelected(mat)} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-10 py-3 border-t border-white/10 flex items-center justify-between text-xs text-white/20 flex-shrink-0">
        <span>Pack-a-Stock · Catálogo de Materiales · {filtered.length} de {materials.length}</span>
        <span>Presiona ESC para salir · Haz click en un material para ver detalles y QR</span>
      </div>

      {/* Detail modal */}
      {selected && (
        <MaterialDetail mat={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
