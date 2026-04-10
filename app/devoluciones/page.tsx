'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import { Badge } from '@/components/ui'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { useReturnLoan } from '@/hooks/useLoans'
import {
  ChevronLeft, ChevronRight, CalendarClock,
  AlertTriangle, Clock, CheckCircle, ArrowLeftRight,
  List, Calendar, Package, RotateCcw, ShieldBan,
} from 'lucide-react'

// ---- Calendar helpers ----
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const DAYS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']

function getDaysUntil(dateString?: string): number {
  if (!dateString) return 0
  return Math.ceil((new Date(dateString).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function CountdownPill({ days }: { days: number }) {
  if (days < 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-500/15 text-red-400">
        <AlertTriangle className="h-3 w-3" />
        Vencido hace {Math.abs(days)} {Math.abs(days) === 1 ? 'dia' : 'dias'}
      </span>
    )
  }
  if (days === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-500/15 text-red-400">
        <Clock className="h-3 w-3" />
        Vence hoy
      </span>
    )
  }
  if (days <= 3) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-400">
        <Clock className="h-3 w-3" />
        Vence en {days} {days === 1 ? 'dia' : 'dias'}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-500/15 text-green-400">
      <Clock className="h-3 w-3" />
      Vence en {days} dias
    </span>
  )
}

interface ReturnModalState {
  isOpen: boolean
  loanId: number | null
  condition: string
  notes: string
}

interface PenaltyModalState {
  isOpen: boolean
  userId: number | null
  userName: string
  reason: string
  daysBlocked: number
  isSubmitting: boolean
}

export default function DevolucionesPage() {
  const { user } = useAuthStore()
  const isInventarista = user?.user_type === 'inventarista'

  const today = new Date()
  const [tab, setTab] = useState<'lista' | 'calendario'>('lista')
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate())
  const [returnModal, setReturnModal] = useState<ReturnModalState>({
    isOpen: false, loanId: null, condition: 'good', notes: '',
  })
  const [penaltyModal, setPenaltyModal] = useState<PenaltyModalState>({
    isOpen: false, userId: null, userName: '', reason: '', daysBlocked: 7, isSubmitting: false,
  })

  const returnMutation = useReturnLoan()

  const { data: loansRes } = useQuery({
    queryKey: ['loans-calendar'],
    queryFn: async () => (await api.get('/loans/loans/?page_size=200')).data,
    staleTime: 30000,
  })

  const loans: any[] = Array.isArray(loansRes) ? loansRes : loansRes?.results ?? []
  const activeLoans = loans.filter((l: any) => l.status === 'active' || l.status === 'overdue')
  const overdueLoans = activeLoans.filter((l: any) => l.status === 'overdue')
  const activeOnly = activeLoans.filter((l: any) => l.status === 'active')

  // Sort for lista: overdue first, then by due date asc
  const sortedLoans = useMemo(() => {
    return [...activeLoans].sort((a: any, b: any) => {
      const da = new Date(a.expected_return_date).getTime()
      const db = new Date(b.expected_return_date).getTime()
      return da - db
    })
  }, [activeLoans])

  // Group loans by return date day key "YYYY-MM-DD"
  const loansByDay = useMemo(() => {
    const map = new Map<string, any[]>()
    activeLoans.forEach((l: any) => {
      const d = new Date(l.expected_return_date)
      const key = d.toISOString().split('T')[0]
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(l)
    })
    return map
  }, [activeLoans])

  const getKey = (y: number, m: number, d: number) => {
    const mm = String(m + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    return `${y}-${mm}-${dd}`
  }

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
    setSelectedDay(null)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
    setSelectedDay(null)
  }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  // Stats
  const now = new Date()
  const overdue = overdueLoans.length
  const dueThisWeek = activeLoans.filter((l: any) => {
    const diff = Math.ceil((new Date(l.expected_return_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff >= 0 && diff <= 7
  }).length
  const dueThisMonth = activeLoans.filter((l: any) => {
    const d = new Date(l.expected_return_date)
    return d.getFullYear() === year && d.getMonth() === month
  }).length

  const selectedKey = selectedDay ? getKey(year, month, selectedDay) : null
  const selectedLoans = selectedKey ? (loansByDay.get(selectedKey) ?? []) : []

  const dayIsToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  const getDayVariant = (key: string) => {
    const dayLoans = loansByDay.get(key) ?? []
    if (dayLoans.length === 0) return null
    const hasOverdue = dayLoans.some((l: any) => l.status === 'overdue')
    const isPast = new Date(key) < now
    if (hasOverdue || isPast) return 'overdue'
    const diff = Math.ceil((new Date(key).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diff <= 3) return 'urgent'
    return 'normal'
  }

  const diffLabel = (d: string) => {
    const diff = Math.ceil((new Date(d).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return { label: `${Math.abs(diff)}d vencido`, color: 'text-red-400' }
    if (diff === 0) return { label: 'Vence hoy', color: 'text-amber-400' }
    if (diff <= 3) return { label: `${diff}d restantes`, color: 'text-amber-400' }
    return { label: `${diff}d restantes`, color: 'text-muted-foreground' }
  }

  // Return handlers
  const handleOpenReturn = (loanId: number) =>
    setReturnModal({ isOpen: true, loanId, condition: 'good', notes: '' })
  const handleCloseReturn = () =>
    setReturnModal({ isOpen: false, loanId: null, condition: 'good', notes: '' })
  const handleSubmitReturn = () => {
    if (!returnModal.loanId) return
    returnMutation.mutate(
      { id: returnModal.loanId, returnData: { condition: returnModal.condition, damage_notes: returnModal.notes } },
      { onSuccess: () => handleCloseReturn() }
    )
  }

  const handleOpenPenalty = (loan: any) => {
    setPenaltyModal({
      isOpen: true,
      userId: loan.borrower,
      userName: loan.borrower_detail?.full_name || loan.borrower_detail?.email || 'Usuario',
      reason: `Prestamo #${loan.id} vencido - Material: ${loan.material_detail?.name || 'N/D'}`,
      daysBlocked: 7,
      isSubmitting: false,
    })
  }
  const handleClosePenalty = () =>
    setPenaltyModal({ isOpen: false, userId: null, userName: '', reason: '', daysBlocked: 7, isSubmitting: false })

  const handleSubmitPenalty = async () => {
    if (!penaltyModal.userId || !penaltyModal.reason) return
    setPenaltyModal(prev => ({ ...prev, isSubmitting: true }))
    try {
      const blockedUntil = new Date()
      blockedUntil.setDate(blockedUntil.getDate() + penaltyModal.daysBlocked)
      await api.put(`/auth/users/${penaltyModal.userId}/block/`, {
        blocked_reason: penaltyModal.reason,
        blocked_until: blockedUntil.toISOString(),
      })
      toast.success(`Usuario penalizado por ${penaltyModal.daysBlocked} dias`)
      handleClosePenalty()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al penalizar usuario')
      setPenaltyModal(prev => ({ ...prev, isSubmitting: false }))
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl border border-primary/20">
            <CalendarClock className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Devoluciones</h1>
            <p className="text-base text-muted-foreground mt-1">Seguimiento y registro de devoluciones de prestamos</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: AlertTriangle, label: 'Vencidos', value: overdue, color: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-500/10' },
            { icon: Clock, label: 'Vencen esta semana', value: dueThisWeek, color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10' },
            { icon: CalendarClock, label: `Vencen en ${MONTHS[month]}`, value: dueThisMonth, color: 'text-primary', border: 'border-primary/30', bg: 'bg-primary/10' },
          ].map(({ icon: Icon, label, value, color, border, bg }) => (
            <Card key={label} className={`p-5 border-2 ${border}`}>
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl ${bg}`}>
                  <Icon className={`h-6 w-6 ${color}`} />
                </div>
                <div>
                  <p className={`text-3xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-0.5">{label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1.5 bg-secondary/30 rounded-xl">
          {[
            { key: 'lista' as const, label: 'Lista', icon: List, count: activeLoans.length },
            { key: 'calendario' as const, label: 'Calendario', icon: Calendar, count: 0 },
          ].map((t) => {
            const Icon = t.icon
            const isActive = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl text-base font-medium transition-all ${
                  isActive
                    ? 'bg-card text-foreground shadow-md border border-border/50'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                }`}
              >
                <Icon className="w-5 h-5" />
                {t.label}
                {t.count > 0 && (
                  <span className={`min-w-[1.5rem] h-6 flex items-center justify-center rounded-full text-sm font-semibold px-2 ${
                    isActive ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                  }`}>
                    {t.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ====== TAB LISTA ====== */}
        {tab === 'lista' && (
          <div className="space-y-5">
            {activeLoans.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="p-16 text-center">
                  <div className="p-4 bg-secondary/30 rounded-2xl w-fit mx-auto mb-6">
                    <CheckCircle className="h-14 w-14 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">Todo al dia</h3>
                  <p className="text-base text-muted-foreground">No hay prestamos pendientes de devolucion</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Vencidos */}
                {overdueLoans.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-500/10 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      </div>
                      <h2 className="text-lg font-bold text-foreground">Vencidos</h2>
                      <Badge variant="danger" className="text-sm px-3 py-1">{overdueLoans.length}</Badge>
                    </div>
                    {sortedLoans.filter((l: any) => l.status === 'overdue').map((loan: any) => (
                      <ReturnCard
                        key={loan.id}
                        loan={loan}
                        isInventarista={isInventarista}
                        onReturn={() => handleOpenReturn(loan.id)}
                        onPenalize={() => handleOpenPenalty(loan)}
                      />
                    ))}
                  </div>
                )}

                {/* Activos */}
                {activeOnly.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <Package className="h-5 w-5 text-green-500" />
                      </div>
                      <h2 className="text-lg font-bold text-foreground">En circulacion</h2>
                    </div>
                    {sortedLoans.filter((l: any) => l.status === 'active').map((loan: any) => (
                      <ReturnCard
                        key={loan.id}
                        loan={loan}
                        isInventarista={isInventarista}
                        onReturn={() => handleOpenReturn(loan.id)}
                        onPenalize={() => {}}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ====== TAB CALENDARIO ====== */}
        {tab === 'calendario' && (
          <div className="grid grid-cols-12 gap-4" style={{ minHeight: '520px' }}>
            {/* Calendar */}
            <div className="col-span-8 bg-card border border-border/50 rounded-xl flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border/20">
                <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                </button>
                <span className="text-base font-semibold text-foreground">
                  {MONTHS[month]} {year}
                </span>
                <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <div className="grid grid-cols-7 border-b border-border/20">
                {DAYS.map(d => (
                  <div key={d} className="py-2 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="border-b border-r border-border/10" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const key = getKey(year, month, day)
                  const dayLoans = loansByDay.get(key) ?? []
                  const variant = getDayVariant(key)
                  const isSelected = selectedDay === day
                  const isToday = dayIsToday(day)
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={`relative flex flex-col p-1.5 border-b border-r border-border/10 transition-colors text-left
                        ${isSelected ? 'bg-primary/10' : 'hover:bg-accent/40'}
                      `}
                    >
                      <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-0.5
                        ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}
                      `}>
                        {day}
                      </span>
                      {dayLoans.length > 0 && (
                        <span className={`text-[10px] font-bold px-1 py-0.5 rounded text-center leading-none
                          ${variant === 'overdue' ? 'bg-red-500/20 text-red-400' :
                            variant === 'urgent' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-primary/15 text-primary'}
                        `}>
                          {dayLoans.length} devol.
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              <div className="px-5 py-2.5 border-t border-border/20 flex items-center gap-5 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-red-500/30 inline-block" />Vencido</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-500/30 inline-block" />Urgente (menos de 3 dias)</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-primary/20 inline-block" />Pendiente</span>
              </div>
            </div>

            {/* Day detail */}
            <div className="col-span-4 bg-card border border-border/50 rounded-xl flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-border/20 flex-shrink-0">
                <p className="text-sm font-semibold text-foreground">
                  {selectedDay ? `${selectedDay} de ${MONTHS[month]}` : 'Selecciona un dia'}
                </p>
                {selectedLoans.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedLoans.length} devolucion{selectedLoans.length !== 1 ? 'es' : ''}
                  </p>
                )}
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-border/20">
                {!selectedDay ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground py-12">
                    <CalendarClock className="h-10 w-10 opacity-20" />
                    <p className="text-sm">Selecciona un dia del calendario</p>
                  </div>
                ) : selectedLoans.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground py-12">
                    <CheckCircle className="h-10 w-10 opacity-20" />
                    <p className="text-sm">Sin devoluciones este dia</p>
                  </div>
                ) : selectedLoans.map((loan: any) => {
                  const { label, color } = diffLabel(loan.expected_return_date)
                  return (
                    <div key={loan.id} className="px-4 py-3 hover:bg-secondary/10 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-1.5 rounded-md bg-primary/10 flex-shrink-0">
                            <ArrowLeftRight className="h-3 w-3 text-primary" />
                          </div>
                          <span className="text-xs font-semibold text-foreground truncate">
                            {loan.material_detail?.name ?? 'Material'}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold flex-shrink-0 ${color}`}>{label}</span>
                      </div>
                      <div className="ml-8 space-y-0.5">
                        <p className="text-[11px] text-muted-foreground">{loan.borrower_detail?.full_name ?? 'Usuario'}</p>
                        <p className="text-[11px] text-muted-foreground">Cantidad: {loan.quantity_loaned}</p>
                        {loan.material_detail?.sku && (
                          <p className="text-[10px] text-muted-foreground/60 font-mono">{loan.material_detail.sku}</p>
                        )}
                      </div>
                      {isInventarista && (
                        <button
                          onClick={() => handleOpenReturn(loan.id)}
                          className="mt-2 ml-8 text-xs text-primary hover:underline"
                        >
                          Registrar devolucion
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ====== Return Modal ====== */}
        {returnModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md border-2 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <RotateCcw className="w-5 h-5 text-primary" />
                  </div>
                  Registrar Devolucion
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 uppercase tracking-wider">
                    Condicion del material
                  </label>
                  <select
                    value={returnModal.condition}
                    onChange={(e) => setReturnModal(prev => ({ ...prev, condition: e.target.value }))}
                    className="w-full rounded-xl border-2 border-border bg-card px-4 py-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                  >
                    <option value="excellent">Excelente</option>
                    <option value="good">Bueno</option>
                    <option value="fair">Regular</option>
                    <option value="poor">Malo</option>
                    <option value="damaged">Danado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 uppercase tracking-wider">
                    Notas (opcional)
                  </label>
                  <textarea
                    value={returnModal.notes}
                    onChange={(e) => setReturnModal(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full min-h-[100px] rounded-xl border-2 border-border bg-card px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    placeholder="Observaciones..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={handleSubmitReturn} size="lg" className="w-full text-base py-3">
                    Confirmar Devolucion
                  </Button>
                  <Button variant="secondary" onClick={handleCloseReturn} size="lg" className="w-full text-base py-3">
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ====== Penalty Modal ====== */}
        {penaltyModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md border-2 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-destructive/10 rounded-lg">
                    <ShieldBan className="w-5 h-5 text-destructive" />
                  </div>
                  Penalizar Usuario
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="p-4 bg-destructive/10 border-2 border-destructive/20 rounded-xl">
                  <p className="text-base text-foreground">
                    <strong>{penaltyModal.userName}</strong> sera bloqueado temporalmente.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 uppercase tracking-wider">
                    Dias de bloqueo
                  </label>
                  <div className="flex gap-2">
                    {[3, 7, 14, 30].map((days) => (
                      <button
                        key={days}
                        onClick={() => setPenaltyModal(prev => ({ ...prev, daysBlocked: days }))}
                        className={`flex-1 py-3 rounded-xl text-base font-medium transition-all ${
                          penaltyModal.daysBlocked === days
                            ? 'bg-destructive text-destructive-foreground'
                            : 'bg-secondary text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {days}d
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 uppercase tracking-wider">
                    Motivo
                  </label>
                  <textarea
                    value={penaltyModal.reason}
                    onChange={(e) => setPenaltyModal(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full min-h-[80px] rounded-xl border-2 border-border bg-card px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    placeholder="Motivo de la penalizacion..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="destructive"
                    onClick={handleSubmitPenalty}
                    disabled={!penaltyModal.reason || penaltyModal.isSubmitting}
                    size="lg"
                    className="w-full text-base py-3"
                  >
                    {penaltyModal.isSubmitting ? 'Aplicando...' : 'Penalizar'}
                  </Button>
                  <Button variant="secondary" onClick={handleClosePenalty} size="lg" className="w-full text-base py-3">
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}

// ---- Card de devolucion ----
function ReturnCard({
  loan,
  isInventarista,
  onReturn,
  onPenalize,
}: {
  loan: any
  isInventarista: boolean
  onReturn: () => void
  onPenalize: () => void
}) {
  const isOverdue = loan.status === 'overdue'
  const days = getDaysUntil(loan.expected_return_date)
  const sku = loan.material_detail?.sku

  return (
    <Card className={`border-l-4 ${isOverdue ? 'border-l-red-500' : 'border-l-green-500'} hover:shadow-lg transition-all duration-300`}>
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 p-5">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl flex-shrink-0 ${isOverdue ? 'bg-destructive/10' : 'bg-primary/10'}`}>
              {isOverdue
                ? <AlertTriangle className="h-5 w-5 text-destructive" />
                : <Package className="h-5 w-5 text-primary" />
              }
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-foreground">
                  {loan.material_detail?.name || `Material #${loan.material}`}
                </h3>
                {sku && (
                  <span className="text-xs text-muted-foreground bg-secondary/40 px-2 py-0.5 rounded-md font-mono">{sku}</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {loan.borrower_detail?.full_name || loan.borrower_detail?.email || 'N/D'}
              </p>
            </div>
            <div className="flex-shrink-0">
              <CountdownPill days={days} />
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-secondary/20 rounded-xl">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Cantidad</p>
              <p className="text-base font-medium text-foreground mt-0.5">x{loan.quantity_loaned}</p>
            </div>
            <div className="p-3 bg-secondary/20 rounded-xl">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Inicio</p>
              <p className="text-sm font-medium text-foreground mt-0.5">
                {loan.issued_at ? new Date(loan.issued_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : 'N/D'}
              </p>
            </div>
            <div className="p-3 bg-secondary/20 rounded-xl">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Devolver</p>
              <p className="text-sm font-medium text-foreground mt-0.5">
                {loan.expected_return_date
                  ? new Date(loan.expected_return_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
                  : 'N/D'}
              </p>
            </div>
          </div>

          {/* Actions */}
          {isInventarista && !loan.is_consumable_loan && (
            <div className={`grid ${isOverdue ? 'grid-cols-2' : 'grid-cols-1'} gap-3 pt-2 border-t border-border/30`}>
              <Button onClick={onReturn} variant="primary" size="lg" className="w-full text-base py-3">
                <RotateCcw className="h-5 w-5 mr-2" />
                Registrar Devolucion
              </Button>
              {isOverdue && (
                <Button onClick={onPenalize} variant="destructive" size="lg" className="w-full text-base py-3">
                  <ShieldBan className="h-5 w-5 mr-2" />
                  Penalizar
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
