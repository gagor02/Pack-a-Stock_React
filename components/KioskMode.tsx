'use client'

import { useEffect, useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import {
  X, ArrowLeftRight, Package, AlertTriangle,
  CheckCircle, Clock, RefreshCw, Tv2,
} from 'lucide-react'

function fmt(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function useNow() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

export default function KioskMode() {
  const { kioskMode, setKioskMode } = useUIStore()
  const { user } = useAuthStore()
  const now = useNow()
  const [lastRefresh, setLastRefresh] = useState(new Date())

  // ─── Datos ────────────────────────────────────────────────────────────────
  const { data: loansRes, refetch: refetchLoans } = useQuery({
    queryKey: ['kiosk-loans'],
    queryFn: async () => (await api.get('/loans/loans/')).data,
    refetchInterval: 30000,
    enabled: kioskMode,
  })
  const { data: matsRes, refetch: refetchMats } = useQuery({
    queryKey: ['kiosk-materials'],
    queryFn: async () => (await api.get('/materials/materials/')).data,
    refetchInterval: 30000,
    enabled: kioskMode,
  })

  const loans: any[] = Array.isArray(loansRes) ? loansRes : loansRes?.results ?? []
  const materials: any[] = Array.isArray(matsRes) ? matsRes : matsRes?.results ?? []

  const activeLoans = loans.filter((l) => l.status === 'active' || l.status === 'overdue')
  const overdueLoans = activeLoans.filter((l) => l.status === 'overdue' || l.is_overdue)
  const available = materials.filter((m) => m.status === 'available').length
  const inUse = materials.filter((m) => m.status !== 'available').length

  const handleRefresh = useCallback(() => {
    refetchLoans()
    refetchMats()
    setLastRefresh(new Date())
  }, [refetchLoans, refetchMats])

  // ESC para salir
  useEffect(() => {
    if (!kioskMode) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setKioskMode(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [kioskMode, setKioskMode])

  // Fullscreen al activar
  useEffect(() => {
    if (kioskMode) {
      document.documentElement.requestFullscreen?.().catch(() => {})
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {})
      }
    }
  }, [kioskMode])

  if (!kioskMode) return null

  const timeStr = now.toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const dateStr = now.toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const accountName = (user as any)?.account?.name ?? 'Pack-a-Stock'

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0a1a] text-white flex flex-col overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-10 py-5 border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-600 to-purple-500 shadow-lg shadow-violet-500/30">
            <Tv2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight">{accountName}</div>
            <div className="text-sm text-white/50 capitalize">{dateStr}</div>
          </div>
        </div>

        <div className="text-center">
          <div className="text-5xl font-black tabular-nums tracking-tight text-white">
            {timeStr}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm text-white/70 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {lastRefresh.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
          </button>
          <button
            onClick={() => setKioskMode(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-red-500/30 text-sm text-white/70 hover:text-white transition-colors"
            title="Salir (ESC)"
          >
            <X className="h-4 w-4" />
            Salir
          </button>
        </div>
      </div>

      {/* ── KPI strip ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4 px-10 py-5">
        {[
          {
            label: 'En préstamo',
            value: activeLoans.length,
            icon: ArrowLeftRight,
            color: 'text-violet-400',
            bg: 'bg-violet-500/10',
            border: 'border-violet-500/20',
          },
          {
            label: 'Disponibles',
            value: available,
            icon: CheckCircle,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20',
          },
          {
            label: 'En uso',
            value: inUse,
            icon: Package,
            color: 'text-sky-400',
            bg: 'bg-sky-500/10',
            border: 'border-sky-500/20',
          },
          {
            label: 'Vencidos',
            value: overdueLoans.length,
            icon: AlertTriangle,
            color: overdueLoans.length > 0 ? 'text-red-400' : 'text-white/30',
            bg: overdueLoans.length > 0 ? 'bg-red-500/10' : 'bg-white/5',
            border: overdueLoans.length > 0 ? 'border-red-500/30' : 'border-white/10',
          },
        ].map(({ label, value, icon: Icon, color, bg, border }) => (
          <div
            key={label}
            className={`${bg} border ${border} rounded-2xl px-6 py-4 flex items-center gap-4`}
          >
            <div className={`p-3 rounded-xl ${bg}`}>
              <Icon className={`h-6 w-6 ${color}`} />
            </div>
            <div>
              <div className={`text-4xl font-black ${color}`}>{value}</div>
              <div className="text-sm text-white/50 mt-0.5">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Active loans table ─────────────────────────────────────────────── */}
      <div className="flex-1 px-10 pb-8 overflow-hidden flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <ArrowLeftRight className="h-5 w-5 text-violet-400" />
          <h2 className="text-lg font-bold text-white/80">
            Préstamos activos
          </h2>
          <span className="text-sm text-white/40">
            — actualiza cada 30 segundos
          </span>
        </div>

        {activeLoans.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <CheckCircle className="h-14 w-14 text-emerald-400/40" />
            <p className="text-xl text-white/40 font-medium">
              Sin préstamos activos en este momento
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-white/5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wider">
                  <th className="text-left px-6 py-3 font-semibold">Material</th>
                  <th className="text-left px-6 py-3 font-semibold">Usuario</th>
                  <th className="text-left px-6 py-3 font-semibold">Cantidad</th>
                  <th className="text-left px-6 py-3 font-semibold">Fecha préstamo</th>
                  <th className="text-left px-6 py-3 font-semibold">Devolución esperada</th>
                  <th className="text-left px-6 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {activeLoans.map((loan, i) => {
                  const isOverdue = loan.status === 'overdue' || loan.is_overdue
                  return (
                    <tr
                      key={loan.id}
                      className={`border-b border-white/5 transition-colors ${
                        isOverdue
                          ? 'bg-red-500/5 hover:bg-red-500/10'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <span className="font-semibold text-white">
                          {loan.material_detail?.name ?? '—'}
                        </span>
                        {loan.material_detail?.sku && (
                          <span className="ml-2 text-xs text-white/30">
                            {loan.material_detail.sku}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-white/70">
                        {loan.borrower_detail?.full_name ?? '—'}
                      </td>
                      <td className="px-6 py-4 text-white/70">
                        {loan.quantity_loaned ?? 1}
                      </td>
                      <td className="px-6 py-4 text-white/50">
                        {fmt(loan.issued_at ?? loan.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={isOverdue ? 'text-red-400 font-semibold' : 'text-white/50'}>
                          {fmt(loan.expected_return_date)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isOverdue ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-bold">
                            <AlertTriangle className="h-3 w-3" />
                            Vencido
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                            <Clock className="h-3 w-3" />
                            Activo
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="px-10 py-3 border-t border-white/10 flex items-center justify-between text-xs text-white/20">
        <span>Pack-a-Stock · Sistema de Gestión de Préstamos</span>
        <span>Presiona ESC para salir del modo kiosco</span>
      </div>
    </div>
  )
}
