'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import dynamic from 'next/dynamic'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import {
  X, Package, Search, RefreshCw, BookOpen,
  CheckCircle, AlertTriangle, MapPin, Tag,
  ChevronLeft, ChevronRight, Plus, Minus,
  Save, Edit2,
} from 'lucide-react'

const QRCodeSVG = dynamic(
  () => import('qrcode.react').then((m) => m.QRCodeSVG),
  { ssr: false, loading: () => <div className="bg-white/10 rounded-xl animate-pulse" /> }
)

type StatusFilter = 'all' | 'available' | 'in_use' | 'low_stock'

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useNow() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

function useOrientation() {
  const [portrait, setPortrait] = useState(false)
  useEffect(() => {
    const update = () => setPortrait(window.innerHeight > window.innerWidth)
    update()
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])
  return portrait
}

// ─── Shared components ────────────────────────────────────────────────────────

function StatusPill({ status, lowStock, small }: { status: string; lowStock?: boolean; small?: boolean }) {
  const base = small
    ? 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold'
    : 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold'
  if (lowStock) return (
    <span className={`${base} bg-amber-500/20 text-amber-400 border border-amber-500/20`}>
      <AlertTriangle className={small ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} />Stock bajo
    </span>
  )
  if (status === 'available') return (
    <span className={`${base} bg-emerald-500/20 text-emerald-400 border border-emerald-500/20`}>
      <CheckCircle className={small ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} />Disponible
    </span>
  )
  return (
    <span className={`${base} bg-sky-500/20 text-sky-400 border border-sky-500/20`}>
      <Package className={small ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} />En uso
    </span>
  )
}

// ─── Card landscape ──────────────────────────────────────────────────────────

function MaterialRowLandscape({ mat, onClick, isInventarista }: { mat: any; onClick: () => void; isInventarista: boolean }) {
  const imgSrc = mat.image || mat.image_url || null
  return (
    <button
      onClick={onClick}
      className="w-full h-full flex items-stretch gap-0 bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-violet-500/30 transition-colors text-left"
    >
      <div className="w-52 flex-shrink-0 bg-white/5 flex items-center justify-center overflow-hidden">
        {imgSrc
          ? <img src={imgSrc} alt={mat.name} className="w-full h-full object-cover" /> // eslint-disable-line
          : <div className="flex flex-col items-center gap-2 text-white/15 p-6"><Package className="h-14 w-14" /><span className="text-xs">Sin imagen</span></div>
        }
      </div>

      <div className="flex-1 px-7 py-4 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-start gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-black text-white leading-tight truncate">{mat.name}</h2>
              {mat.sku && <p className="text-sm text-white/30 font-mono mt-0.5">{mat.sku}</p>}
            </div>
            <StatusPill status={mat.status} lowStock={mat.is_low_stock} />
          </div>
          {mat.description && <p className="text-sm text-white/50 leading-relaxed line-clamp-2 mb-2">{mat.description}</p>}
        </div>
        <div className="flex flex-wrap gap-4">
          {(mat.category_detail?.name || mat.category_name) && (
            <div className="flex items-center gap-2 text-sm text-white/50">
              <div className="p-1.5 bg-violet-500/10 rounded-lg"><Tag className="h-3.5 w-3.5 text-violet-400" /></div>
              <span>{mat.category_detail?.name ?? mat.category_name}</span>
            </div>
          )}
          {(mat.location_detail?.name || mat.location_name) && (
            <div className="flex items-center gap-2 text-sm text-white/50">
              <div className="p-1.5 bg-emerald-500/10 rounded-lg"><MapPin className="h-3.5 w-3.5 text-emerald-400" /></div>
              <span>{mat.location_detail?.name ?? mat.location_name}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-white/30">Disponibles:</span>
            <span className={`font-bold ${mat.is_low_stock ? 'text-amber-400' : 'text-emerald-400'}`}>{mat.available_quantity ?? 0}</span>
            <span className="text-white/20">/ {mat.quantity ?? 0}</span>
          </div>
        </div>
        {isInventarista && (
          <p className="text-[10px] text-violet-400/50 mt-2">Toca para editar</p>
        )}
      </div>

      <div className="w-48 flex-shrink-0 flex flex-col items-center justify-center gap-3 px-5 py-4 border-l border-white/10">
        {mat.qr_code ? (
          <>
            <div className="bg-white p-3 rounded-2xl shadow-lg shadow-black/40">
              <QRCodeSVG value={mat.qr_code} size={120} />
            </div>
            <p className="text-[10px] text-white/20 font-mono text-center break-all leading-tight max-w-[8rem]">{mat.qr_code}</p>
          </>
        ) : <p className="text-xs text-white/20">Sin QR</p>}
      </div>
    </button>
  )
}

// ─── Card portrait (compact) ─────────────────────────────────────────────────

function MaterialRowPortrait({ mat, onClick, isInventarista }: { mat: any; onClick: () => void; isInventarista: boolean }) {
  const imgSrc = mat.image || mat.image_url || null
  return (
    <button
      onClick={onClick}
      className="w-full h-full flex items-stretch gap-0 bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-violet-500/30 transition-colors text-left"
    >
      <div className="w-28 flex-shrink-0 bg-white/5 flex items-center justify-center overflow-hidden">
        {imgSrc
          ? <img src={imgSrc} alt={mat.name} className="w-full h-full object-cover" /> // eslint-disable-line
          : <div className="flex items-center justify-center text-white/15 p-3"><Package className="h-8 w-8" /></div>
        }
      </div>

      <div className="flex-1 px-4 py-3 flex flex-col justify-between min-w-0">
        <div className="flex items-start gap-2 mb-1">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black text-white leading-tight truncate">{mat.name}</h2>
            {mat.sku && <p className="text-xs text-white/30 font-mono">{mat.sku}</p>}
          </div>
          <StatusPill status={mat.status} lowStock={mat.is_low_stock} small />
        </div>
        <div className="flex flex-wrap gap-2">
          {(mat.category_detail?.name || mat.category_name) && (
            <div className="flex items-center gap-1 text-xs text-white/40">
              <Tag className="h-3 w-3 text-violet-400" />
              <span className="truncate max-w-[8rem]">{mat.category_detail?.name ?? mat.category_name}</span>
            </div>
          )}
          {(mat.location_detail?.name || mat.location_name) && (
            <div className="flex items-center gap-1 text-xs text-white/40">
              <MapPin className="h-3 w-3 text-emerald-400" />
              <span className="truncate max-w-[8rem]">{mat.location_detail?.name ?? mat.location_name}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-white/30">Stock:</span>
            <span className={`font-bold ${mat.is_low_stock ? 'text-amber-400' : 'text-emerald-400'}`}>{mat.available_quantity ?? 0}</span>
            <span className="text-white/20">/{mat.quantity ?? 0}</span>
          </div>
        </div>
        {isInventarista && <p className="text-[9px] text-violet-400/50 mt-1">Toca para editar</p>}
      </div>

      <div className="w-24 flex-shrink-0 flex flex-col items-center justify-center gap-1 px-2 py-3 border-l border-white/10">
        {mat.qr_code ? (
          <div className="bg-white p-1.5 rounded-lg shadow-lg shadow-black/40">
            <QRCodeSVG value={mat.qr_code} size={72} />
          </div>
        ) : <p className="text-[10px] text-white/20">Sin QR</p>}
      </div>
    </button>
  )
}

// ─── Manage panel (inventarista only) ────────────────────────────────────────

function ManagePanel({ mat, onClose, onSaved }: { mat: any; onClose: () => void; onSaved: (updated: any) => void }) {
  const queryClient = useQueryClient()
  const [qty, setQty] = useState<number>(mat.quantity ?? 0)
  const [name, setName] = useState<string>(mat.name ?? '')
  const [description, setDescription] = useState<string>(mat.description ?? '')
  const [editing, setEditing] = useState(false)

  const mutation = useMutation({
    mutationFn: (data: any) => api.patch(`/materials/materials/${mat.id}/`, data).then(r => r.data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['catalog-materials'] })
      toast.success('Material actualizado')
      onSaved(updated)
      onClose()
    },
    onError: () => toast.error('Error al actualizar'),
  })

  const handleSave = () => {
    const payload: any = { quantity: qty }
    if (editing) { payload.name = name; payload.description = description }
    mutation.mutate(payload)
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const imgSrc = mat.image || mat.image_url || null

  return (
    <div
      className="fixed inset-0 z-[10001] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[#0f0f22] border border-white/15 rounded-3xl w-full max-w-lg shadow-2xl shadow-black/60 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <StatusPill status={mat.status} lowStock={mat.is_low_stock} small />
            {mat.sku && <span className="text-xs text-white/30 font-mono">{mat.sku}</span>}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg bg-white/10 hover:bg-white/15 text-white/50 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Photo + QR row */}
          <div className="flex gap-4 items-center">
            <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
              {imgSrc
                ? <img src={imgSrc} alt={mat.name} className="w-full h-full object-cover" /> // eslint-disable-line
                : <Package className="h-10 w-10 text-white/15" />
              }
            </div>
            <div className="flex-1 min-w-0">
              {editing ? (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white font-bold text-lg focus:outline-none focus:border-violet-500/50 mb-2"
                />
              ) : (
                <h2 className="text-xl font-black text-white truncate mb-1">{mat.name}</h2>
              )}
              <div className="flex items-center gap-2">
                {(mat.category_detail?.name || mat.category_name) && (
                  <span className="text-xs text-white/40 flex items-center gap-1">
                    <Tag className="h-3 w-3 text-violet-400" />{mat.category_detail?.name ?? mat.category_name}
                  </span>
                )}
                {(mat.location_detail?.name || mat.location_name) && (
                  <span className="text-xs text-white/40 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-emerald-400" />{mat.location_detail?.name ?? mat.location_name}
                  </span>
                )}
              </div>
            </div>
            {mat.qr_code && (
              <div className="bg-white p-2 rounded-xl flex-shrink-0">
                <QRCodeSVG value={mat.qr_code} size={80} />
              </div>
            )}
          </div>

          {/* Description edit */}
          {editing && (
            <div>
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-1">Descripción</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-violet-500/50 resize-none"
              />
            </div>
          )}

          {/* Stock control */}
          <div className="bg-white/5 rounded-2xl p-4">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Ajustar stock total</p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQty(q => Math.max(0, q - 1))}
                className="w-12 h-12 rounded-xl bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-white/70 flex items-center justify-center transition-colors"
              >
                <Minus className="h-5 w-5" />
              </button>
              <div className="flex-1 text-center">
                <div className="text-4xl font-black text-white tabular-nums">{qty}</div>
                <div className="text-xs text-white/30 mt-0.5">
                  En préstamo: {(mat.quantity ?? 0) - (mat.available_quantity ?? 0)} · Disponibles: {Math.max(0, qty - ((mat.quantity ?? 0) - (mat.available_quantity ?? 0)))}
                </div>
              </div>
              <button
                onClick={() => setQty(q => q + 1)}
                className="w-12 h-12 rounded-xl bg-white/10 hover:bg-emerald-500/20 hover:text-emerald-400 text-white/70 flex items-center justify-center transition-colors"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => setEditing(e => !e)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                editing ? 'bg-violet-600 text-white' : 'bg-white/10 text-white/60 hover:bg-white/15 hover:text-white'
              }`}
            >
              <Edit2 className="h-4 w-4" />
              {editing ? 'Editando' : 'Editar nombre'}
            </button>
            <button
              onClick={handleSave}
              disabled={mutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {mutation.isPending ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CatalogMode() {
  const { catalogMode, setCatalogMode } = useUIStore()
  const { user } = useAuthStore()
  const now = useNow()
  const portrait = useOrientation()
  const isInventarista = user?.user_type === 'inventarista'

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(0)
  const [timerKey, setTimerKey] = useState(0)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [managing, setManaging] = useState<any | null>(null)

  const cardsPerPage = portrait ? 5 : 3

  const { data: matsRes, refetch } = useQuery({
    queryKey: ['catalog-materials'],
    queryFn: async () => (await api.get('/materials/materials/?page_size=200')).data,
    refetchInterval: 30000,
    enabled: catalogMode,
  })

  const [materials, setMaterials] = useState<any[]>([])
  useEffect(() => {
    const list: any[] = Array.isArray(matsRes) ? matsRes : matsRes?.results ?? []
    setMaterials(list)
  }, [matsRes])

  const handleRefresh = useCallback(() => { refetch(); setLastRefresh(new Date()) }, [refetch])

  const filtered = useMemo(() => materials.filter((m) => {
    const q = search.toLowerCase()
    const matchesSearch = !q || m.name?.toLowerCase().includes(q) || m.sku?.toLowerCase().includes(q) ||
      m.category_detail?.name?.toLowerCase().includes(q) || m.location_detail?.name?.toLowerCase().includes(q)
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'available' && m.status === 'available') ||
      (statusFilter === 'in_use' && m.status !== 'available') ||
      (statusFilter === 'low_stock' && m.is_low_stock)
    return matchesSearch && matchesStatus
  }), [materials, search, statusFilter])

  const totalPages = Math.ceil(filtered.length / cardsPerPage)
  const pageItems = filtered.slice(page * cardsPerPage, (page + 1) * cardsPerPage)

  useEffect(() => { setPage(0) }, [search, statusFilter, portrait])

  const prevPage = useCallback(() => { setPage(p => Math.max(0, p - 1)); setTimerKey(k => k + 1) }, [])
  const nextPage = useCallback(() => { setPage(p => (p + 1) % (totalPages || 1)); setTimerKey(k => k + 1) }, [totalPages])

  // Auto-advance every 7 seconds
  useEffect(() => {
    if (!catalogMode || totalPages <= 1 || managing) return
    const t = setTimeout(() => { setPage(p => (p + 1) % totalPages); setTimerKey(k => k + 1) }, 7000)
    return () => clearTimeout(t)
  }, [catalogMode, totalPages, timerKey, search, statusFilter, managing])

  // Keyboard nav
  useEffect(() => {
    if (!catalogMode) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !managing) { setCatalogMode(false); return }
      if (!managing) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextPage()
        if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   prevPage()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [catalogMode, setCatalogMode, nextPage, prevPage, managing])

  // Fullscreen (only on non-mobile)
  useEffect(() => {
    if (catalogMode && !portrait) {
      document.documentElement.requestFullscreen?.().catch(() => {})
    } else {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    }
  }, [catalogMode, portrait])

  if (!catalogMode) return null

  // inject keyframe once
  if (typeof document !== 'undefined' && !document.getElementById('catalog-kf')) {
    const s = document.createElement('style')
    s.id = 'catalog-kf'
    s.textContent = '@keyframes progress7s { from { width: 0% } to { width: 100% } }'
    document.head.appendChild(s)
  }

  const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = now.toLocaleDateString('es-MX', portrait
    ? { day: 'numeric', month: 'short', year: 'numeric' }
    : { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const accountName = (user as any)?.account?.name ?? 'Pack-a-Stock'

  const filterTabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'all',       label: 'Todos',       count: materials.length },
    { key: 'available', label: 'Disponibles', count: materials.filter(m => m.status === 'available').length },
    { key: 'in_use',    label: 'En uso',      count: materials.filter(m => m.status !== 'available').length },
    { key: 'low_stock', label: 'Stock bajo',  count: materials.filter(m => m.is_low_stock).length },
  ]

  const px = portrait ? 'px-4' : 'px-10'

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0a1a] text-white flex flex-col overflow-hidden">

      {/* Header */}
      <div className={`flex items-center justify-between ${px} py-2 border-b border-white/10 flex-shrink-0`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-violet-600 to-purple-500 shadow-lg shadow-violet-500/30">
            <BookOpen className={portrait ? 'h-5 w-5 text-white' : 'h-6 w-6 text-white'} />
          </div>
          {!portrait && (
            <div>
              <div className="text-xl font-bold tracking-tight">{accountName} · Catálogo</div>
              <div className="text-sm text-white/40 capitalize">{dateStr}</div>
            </div>
          )}
          {portrait && (
            <div className="text-base font-bold tracking-tight leading-tight">
              <div>{accountName}</div>
              <div className="text-xs text-white/40">{dateStr}</div>
            </div>
          )}
        </div>

        <div className={`tabular-nums font-black tracking-tight ${portrait ? 'text-2xl' : 'text-4xl'}`}>{timeStr}</div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white/70 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {!portrait && lastRefresh.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
          </button>
          <button
            onClick={() => setCatalogMode(false)}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-white/10 hover:bg-red-500/30 text-xs text-white/70 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
            {!portrait && 'Salir'}
          </button>
        </div>
      </div>

      {/* Search + filters */}
      <div className={`${px} py-1.5 flex flex-wrap gap-2 flex-shrink-0 border-b border-white/5`}>
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-white/5 border border-white/10 pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 transition-colors"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                statusFilter === tab.key ? 'bg-violet-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
              }`}
            >
              {tab.label} <span className="opacity-60">{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className={`flex-1 ${px} py-2 flex flex-col gap-2 overflow-hidden`}>
        {filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <Package className="h-16 w-16 text-white/10" />
            <p className="text-xl text-white/30 font-medium">Sin materiales</p>
          </div>
        ) : (
          pageItems.map((mat) => (
            <div key={mat.id} className="flex-1 min-h-0 flex flex-col">
              {portrait
                ? <MaterialRowPortrait mat={mat} onClick={() => isInventarista && setManaging(mat)} isInventarista={isInventarista} />
                : <MaterialRowLandscape mat={mat} onClick={() => isInventarista && setManaging(mat)} isInventarista={isInventarista} />
              }
            </div>
          ))
        )}
      </div>

      {/* Pagination footer */}
      <div className={`${px} py-2 border-t border-white/10 flex items-center justify-between flex-shrink-0`}>
        <span className="text-xs text-white/20 hidden sm:block">
          {filtered.length} material{filtered.length !== 1 ? 'es' : ''}
        </span>

        {totalPages > 1 && (
          <div className="flex items-center gap-2 mx-auto sm:mx-0">
            <button onClick={prevPage} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-sm text-white transition-colors">
              <ChevronLeft className="h-4 w-4" />
              {!portrait && 'Anterior'}
            </button>

            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => { setPage(i); setTimerKey(k => k + 1) }}
                  className="relative h-2 rounded-full bg-white/20 hover:bg-white/30 overflow-hidden transition-all"
                  style={{ width: portrait ? 24 : 32 }}
                >
                  {i === page && (
                    <span className="absolute inset-y-0 left-0 bg-violet-500 rounded-full" style={{ animation: 'progress7s 7s linear forwards' }} />
                  )}
                  {i < page && <span className="absolute inset-0 bg-violet-500/50 rounded-full" />}
                </button>
              ))}
            </div>

            <button onClick={nextPage} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-sm text-white transition-colors">
              {!portrait && 'Siguiente'}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        <span className="text-xs text-white/20 hidden sm:block">
          {totalPages > 1 ? `${page + 1}/${totalPages} · ` : ''}ESC salir
        </span>
      </div>

      {/* Manage panel — inventarista only */}
      {managing && (
        <ManagePanel
          mat={managing}
          onClose={() => setManaging(null)}
          onSaved={(updated) => {
            setMaterials(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m))
            setManaging(null)
          }}
        />
      )}
    </div>
  )
}
