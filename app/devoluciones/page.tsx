'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import DashboardLayout from '@/components/layout/DashboardLayout'
import api from '@/lib/api'
import Link from 'next/link'
import {
  ChevronLeft, ChevronRight, CalendarClock,
  AlertTriangle, Clock, CheckCircle, ArrowLeftRight,
} from 'lucide-react'

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

export default function DevolucionesPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate())

  const { data: loansRes } = useQuery({
    queryKey: ['loans-calendar'],
    queryFn: async () => (await api.get('/loans/loans/?page_size=200')).data,
    staleTime: 30000,
  })

  const loans: any[] = Array.isArray(loansRes) ? loansRes : loansRes?.results ?? []
  const activeLoans = loans.filter((l: any) => l.status === 'active' || l.status === 'overdue')

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
  const overdue = activeLoans.filter((l: any) => l.status === 'overdue').length
  const dueThisWeek = activeLoans.filter((l: any) => {
    const d = new Date(l.expected_return_date)
    const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff >= 0 && diff <= 7
  }).length
  const dueThisMonth = activeLoans.filter((l: any) => {
    const d = new Date(l.expected_return_date)
    return d.getFullYear() === year && d.getMonth() === month
  }).length

  // Selected day loans
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

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  const diffLabel = (d: string) => {
    const diff = Math.ceil((new Date(d).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return { label: `${Math.abs(diff)}d vencido`, color: 'text-red-400' }
    if (diff === 0) return { label: 'Vence hoy', color: 'text-amber-400' }
    if (diff <= 3) return { label: `${diff}d restantes`, color: 'text-amber-400' }
    return { label: `${diff}d restantes`, color: 'text-muted-foreground' }
  }

  return (
    <DashboardLayout>
      <div className="p-6 flex flex-col gap-5 h-screen overflow-hidden">

        {/* Header */}
        <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl border border-primary/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarClock className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Devoluciones</h1>
              <p className="text-sm text-muted-foreground">Calendario de vencimientos de prestamos</p>
            </div>
          </div>
          <Link href="/loans" className="text-xs text-primary hover:underline">
            Ver todos los prestamos
          </Link>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: AlertTriangle, label: 'Vencidos', value: overdue, color: 'text-red-400', border: 'border-red-500/40', bg: 'bg-red-500/10' },
            { icon: Clock, label: 'Vencen esta semana', value: dueThisWeek, color: 'text-amber-400', border: 'border-amber-500/40', bg: 'bg-amber-500/10' },
            { icon: CalendarClock, label: `Vencen en ${MONTHS[month]}`, value: dueThisMonth, color: 'text-primary', border: 'border-primary/40', bg: 'bg-primary/10' },
          ].map(({ icon: Icon, label, value, color, border, bg }) => (
            <div key={label} className={`flex items-center gap-4 p-4 rounded-xl border-2 ${border} bg-card`}>
              <div className={`p-3 rounded-lg ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className={`text-3xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Calendar + Detail */}
        <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">

          {/* Calendar */}
          <div className="col-span-8 bg-card border border-border/50 rounded-xl flex flex-col overflow-hidden">
            {/* Nav */}
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

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-border/20">
              {DAYS.map(d => (
                <div key={d} className="py-2 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {d}
                </div>
              ))}
            </div>

            {/* Days grid */}
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
                      <div className="flex flex-col gap-0.5 w-full">
                        <span className={`text-[10px] font-bold px-1 py-0.5 rounded text-center leading-none
                          ${variant === 'overdue' ? 'bg-red-500/20 text-red-400' :
                            variant === 'urgent' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-primary/15 text-primary'}
                        `}>
                          {dayLoans.length} devol.
                        </span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Legend */}
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
                {selectedDay
                  ? `${selectedDay} de ${MONTHS[month]}`
                  : 'Selecciona un dia'}
              </p>
              {selectedLoans.length > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedLoans.length} devolucion{selectedLoans.length !== 1 ? 'es' : ''}
                </p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-border/20">
              {!selectedDay ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                  <CalendarClock className="h-10 w-10 opacity-20" />
                  <p className="text-sm">Selecciona un dia del calendario</p>
                </div>
              ) : selectedLoans.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
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
                      <p className="text-[11px] text-muted-foreground">
                        {loan.borrower_detail?.full_name ?? 'Usuario'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Cantidad: {loan.quantity_loaned}
                      </p>
                      {loan.material_detail?.sku && (
                        <p className="text-[10px] text-muted-foreground/60 font-mono">
                          {loan.material_detail.sku}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
