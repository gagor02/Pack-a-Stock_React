'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Bell, X, CheckCheck, Inbox, AlertTriangle, Clock, Package, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import { useNotifications, AppNotification, NotificationType } from '@/hooks/useNotifications'

interface NotificationBellProps {
  sidebarMode?: boolean
  sidebarCollapsed?: boolean
}

const typeConfig: Record<NotificationType, { icon: any; color: string; bg: string }> = {
  pending_request: { icon: Inbox, color: 'text-amber-400', bg: 'bg-amber-500/15' },
  overdue_loan: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/15' },
  due_today: { icon: Clock, color: 'text-red-400', bg: 'bg-red-500/15' },
  due_soon: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/15' },
  low_stock: { icon: Package, color: 'text-amber-400', bg: 'bg-amber-500/15' },
}

function formatRelative(date: string) {
  if (!date) return ''
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `hace ${days}d`
}

export default function NotificationBell({ sidebarMode = false, sidebarCollapsed = false }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const { notifications, unreadCount, readIds, markRead, markAllRead } = useNotifications()

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleNotificationClick = (n: AppNotification) => {
    markRead(n.id)
    setOpen(false)
  }

  return (
    <div className={sidebarMode ? 'relative w-full' : 'relative'}>
      {/* Bell button */}
      <button
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        className={sidebarMode
          ? clsx(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              sidebarCollapsed && 'justify-center'
            )
          : 'relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all'
        }
        title="Notificaciones"
      >
        {sidebarMode ? (
          <>
            <div className="relative flex-shrink-0">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && sidebarCollapsed && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </div>
            {!sidebarCollapsed && (
              <>
                <span className="flex-1">Notificaciones</span>
                {unreadCount > 0 && (
                  <span className="min-w-[20px] h-5 text-[10px] font-bold rounded-full flex items-center justify-center px-1.5 leading-none flex-shrink-0 bg-red-500 text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none shadow-lg">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          className={clsx(
            'w-[380px] bg-card border border-border/50 rounded-2xl shadow-2xl z-50 overflow-hidden',
            sidebarMode
              ? 'absolute left-full ml-2 bottom-0'
              : 'absolute right-0 top-full mt-2'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/20 bg-secondary/10">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Notificaciones</span>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors"
                  title="Marcar todas como leídas"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Todas leídas
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Bell className="h-10 w-10 mb-2 opacity-20" />
                <p className="text-sm">Sin notificaciones</p>
              </div>
            ) : (
              <div className="divide-y divide-border/10">
                {notifications.map(n => {
                  const cfg = typeConfig[n.type]
                  const Icon = cfg.icon
                  const isRead = readIds.includes(n.id)
                  return (
                    <Link
                      key={n.id}
                      href={n.href}
                      onClick={() => handleNotificationClick(n)}
                      className={`flex items-start gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors group ${isRead ? 'opacity-50' : ''}`}
                    >
                      <div className={`p-2 rounded-lg ${cfg.bg} flex-shrink-0 mt-0.5`}>
                        <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-xs font-semibold text-foreground leading-tight ${!isRead ? '' : 'text-muted-foreground'}`}>
                            {n.title}
                          </p>
                          {!isRead && <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{n.description}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">{formatRelative(n.date)}</p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 flex-shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-border/20 px-4 py-2.5 bg-secondary/5">
              <p className="text-[11px] text-muted-foreground text-center">
                {notifications.length} notificación{notifications.length !== 1 ? 'es' : ''} · {unreadCount} sin leer
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
