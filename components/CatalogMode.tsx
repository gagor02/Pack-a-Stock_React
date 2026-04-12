'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import dynamic from 'next/dynamic'
import api from '@/lib/api'

// Load QRCodeSVG client-side only to avoid SSR issues
const QRCodeSVG = dynamic(
  () => import('qrcode.react').then((m) => m.QRCodeSVG),
  { ssr: false, loading: () => <div className="w-[120px] h-[120px] bg-white/10 rounded-xl animate-pulse" /> }
)
import {
  X, Package, Search, RefreshCw, BookOpen,
  CheckCircle, AlertTriangle, MapPin, Tag,
  ChevronLeft, ChevronRight,
} from 'lucide-react'

type StatusFilter = 'all' | 'available' | 'in_use' | 'low_stock'

const CARDS_PER_PAGE = 3

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
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-amber-500/20 text-amber-400 border border-amber-500/20">
        <AlertTriangle className="h-3.5 w-3.5" />Stock bajo
      </span>
    )
  }
  if (status === 'available') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">
        <CheckCircle className="h-3.5 w-3.5" />Disponible
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-sky-500/20 text-sky-400 border border-sky-500/20">
      <Package className="h-3.5 w-3.5" />En uso
    </span>
  )
}

function MaterialRow({ mat }: { mat: any }) {
  const imgSrc = mat.image || mat.image_url || null

  return (
    <div className="flex items-stretch gap-0 bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-violet-500/20 transition-colors">

      {/* Photo */}
      <div className="w-52 flex-shrink-0 bg-white/5 flex items-center justify-center overflow-hidden">
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgSrc} alt={mat.name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-white/15 p-6">
            <Package className="h-14 w-14" />
            <span className="text-xs">Sin imagen</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 px-7 py-5 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-black text-white leading-tight truncate">{mat.name}</h2>
              {mat.sku && (
                <p className="text-sm text-white/30 font-mono mt-1">{mat.sku}</p>
              )}
            </div>
            <StatusPill status={mat.status} lowStock={mat.is_low_stock} />
          </div>

          {mat.description && (
            <p className="text-sm text-white/50 leading-relaxed line-clamp-2 mb-3">{mat.description}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-4">
          {(mat.category_detail?.name || mat.category_name) && (
            <div className="flex items-center gap-2 text-sm text-white/50">
              <div className="p-1.5 bg-violet-500/10 rounded-lg">
                <Tag className="h-3.5 w-3.5 text-violet-400" />
              </div>
              <span>{mat.category_detail?.name ?? mat.category_name}</span>
            </div>
          )}
          {(mat.location_detail?.name || mat.location_name) && (
            <div className="flex items-center gap-2 text-sm text-white/50">
              <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                <MapPin className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <span>{mat.location_detail?.name ?? mat.location_name}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-white/30">Disponibles:</span>
            <span className={`font-bold ${mat.is_low_stock ? 'text-amber-400' : 'text-emerald-400'}`}>
              {mat.available_quantity ?? 0}
            </span>
            <span className="text-white/20">/ {mat.quantity ?? 0}</span>
          </div>
          {mat.serial_number && (
            <div className="flex items-center gap-2 text-sm text-white/40">
              <span className="text-white/20">S/N:</span>
              <span className="font-mono">{mat.serial_number}</span>
            </div>
          )}
        </div>
      </div>

      {/* QR */}
      <div className="w-48 flex-shrink-0 flex flex-col items-center justify-center gap-3 px-5 py-5 border-l border-white/10 bg-white/3">
        {mat.qr_code ? (
          <>
            <div className="bg-white p-3 rounded-2xl shadow-lg shadow-black/40">
              <QRCodeSVG value={mat.qr_code} size={120} />
            </div>
            <p className="text-[10px] text-white/20 font-mono text-center break-all leading-tight max-w-[8rem]">
              {mat.qr_code}
            </p>
          </>
        ) : (
          <p className="text-xs text-white/20 text-center">Sin QR</p>
        )}
      </div>
    </div>
  )
}

export default function CatalogMode() {
  const { catalogMode, setCatalogMode } = useUIStore()
  const { user } = useAuthStore()
  const now = useNow()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(0)
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

  const totalPages = Math.ceil(filtered.length / CARDS_PER_PAGE)
  const pageItems = filtered.slice(page * CARDS_PER_PAGE, (page + 1) * CARDS_PER_PAGE)

  // Reset page when filter/search changes
  useEffect(() => { setPage(0) }, [search, statusFilter])

  const prevPage = useCallback(() => setPage((p) => Math.max(0, p - 1)), [])
  const nextPage = useCallback(() => setPage((p) => Math.min(totalPages - 1, p + 1)), [totalPages])

  // Keyboard navigation
  useEffect(() => {
    if (!catalogMode) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setCatalogMode(false); return }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextPage()
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   prevPage()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [catalogMode, setCatalogMode, nextPage, prevPage])

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
    { key: 'all',       label: 'Todos',       count: materials.length },
    { key: 'available', label: 'Disponibles', count: materials.filter(m => m.status === 'available').length },
    { key: 'in_use',    label: 'En uso',       count: materials.filter(m => m.status !== 'available').length },
    { key: 'low_stock', label: 'Stock bajo',   count: materials.filter(m => m.is_low_stock).length },
  ]

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0a1a] text-white flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-10 py-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-600 to-purple-500 shadow-lg shadow-violet-500/30">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight">{accountName} · Catálogo</div>
            <div className="text-sm text-white/40 capitalize">{dateStr}</div>
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
      <div className="px-10 py-3 flex flex-col sm:flex-row gap-3 flex-shrink-0 border-b border-white/5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <input
            type="text"
            placeholder="Buscar material, SKU, categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-white/5 border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 transition-colors"
          />
        </div>
        <div className="flex gap-2">
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
              <span className="ml-1.5 text-xs opacity-60">{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 px-10 py-5 flex flex-col gap-4 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <Package className="h-16 w-16 text-white/10" />
            <p className="text-xl text-white/30 font-medium">Sin materiales</p>
          </div>
        ) : (
          pageItems.map((mat) => (
            <MaterialRow key={mat.id} mat={mat} />
          ))
        )}
      </div>

      {/* Pagination footer */}
      <div className="px-10 py-4 border-t border-white/10 flex items-center justify-between flex-shrink-0">
        <span className="text-xs text-white/20">
          Pack-a-Stock · Catálogo · {filtered.length} material{filtered.length !== 1 ? 'es' : ''}
        </span>

        {totalPages > 1 && (
          <div className="flex items-center gap-3">
            <button
              onClick={prevPage}
              disabled={page === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed text-sm text-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>

            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    i === page ? 'bg-violet-500 scale-125' : 'bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={nextPage}
              disabled={page >= totalPages - 1}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed text-sm text-white transition-colors"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        <span className="text-xs text-white/20">
          {totalPages > 1 ? `Página ${page + 1} de ${totalPages} · ` : ''}ESC para salir · ← → para navegar
        </span>
      </div>
    </div>
  )
}
