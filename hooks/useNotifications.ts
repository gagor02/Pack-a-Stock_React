'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNotificationStore } from '@/store/notificationStore'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'

export type NotificationType = 'pending_request' | 'overdue_loan' | 'due_today' | 'due_soon' | 'low_stock'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  description: string
  href: string
  priority: 'high' | 'medium' | 'low'
  date: string
}

export function useNotifications() {
  const { isAuthenticated } = useAuthStore()

  const { data: requestsResponse } = useQuery({
    queryKey: ['loan-requests'],
    queryFn: async () => (await api.get('/loans/loan-requests/')).data,
    refetchInterval: 30000,
    staleTime: 15000,
    enabled: isAuthenticated,
  })

  const { data: loansResponse } = useQuery({
    queryKey: ['loans'],
    queryFn: async () => (await api.get('/loans/loans/')).data,
    refetchInterval: 30000,
    staleTime: 15000,
    enabled: isAuthenticated,
  })

  const { data: materialsResponse } = useQuery({
    queryKey: ['materials'],
    queryFn: async () => (await api.get('/materials/materials/')).data,
    refetchInterval: 60000,
    staleTime: 30000,
    enabled: isAuthenticated,
  })

  const requests = Array.isArray(requestsResponse) ? requestsResponse : requestsResponse?.results ?? []
  const loans = Array.isArray(loansResponse) ? loansResponse : loansResponse?.results ?? []
  const materials = Array.isArray(materialsResponse) ? materialsResponse : materialsResponse?.results ?? []

  const notifications = useMemo((): AppNotification[] => {
    const result: AppNotification[] = []

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Solicitudes pendientes (alta prioridad)
    requests
      .filter((r: any) => r.status === 'pending')
      .forEach((r: any) => {
        result.push({
          id: `req-${r.id}`,
          type: 'pending_request',
          title: 'Solicitud pendiente',
          description: `${r.requester_detail?.full_name || 'Usuario'} — ${r.items?.length || 1} ítem(s)`,
          href: '/requests',
          priority: 'high',
          date: r.created_at || r.request_date || new Date().toISOString(),
        })
      })

    // Préstamos vencidos (alta prioridad)
    loans
      .filter((l: any) => l.is_overdue || l.status === 'overdue')
      .forEach((l: any) => {
        result.push({
          id: `overdue-${l.id}`,
          type: 'overdue_loan',
          title: 'Préstamo vencido',
          description: `${l.borrower_detail?.full_name || 'Usuario'} — ${l.material_detail?.name || 'Material'}`,
          href: '/loans',
          priority: 'high',
          date: l.expected_return_date || l.return_date || l.created_at || '',
        })
      })

    // Entregan hoy (alta prioridad)
    loans
      .filter((l: any) => {
        if (l.is_overdue || l.status === 'overdue' || l.status === 'returned') return false
        const returnDate = l.expected_return_date || l.return_date
        if (!returnDate) return false
        const d = new Date(returnDate)
        d.setHours(0, 0, 0, 0)
        return d.getTime() === today.getTime()
      })
      .forEach((l: any) => {
        result.push({
          id: `today-${l.id}`,
          type: 'due_today',
          title: 'Entrega programada hoy',
          description: `${l.borrower_detail?.full_name || 'Usuario'} devuelve ${l.material_detail?.name || 'Material'}`,
          href: '/loans',
          priority: 'high',
          date: l.expected_return_date || l.created_at || '',
        })
      })

    // Entregan mañana (media prioridad)
    loans
      .filter((l: any) => {
        if (l.is_overdue || l.status === 'overdue' || l.status === 'returned') return false
        const returnDate = l.expected_return_date || l.return_date
        if (!returnDate) return false
        const d = new Date(returnDate)
        d.setHours(0, 0, 0, 0)
        return d.getTime() === tomorrow.getTime()
      })
      .forEach((l: any) => {
        result.push({
          id: `soon-${l.id}`,
          type: 'due_soon',
          title: 'Entrega mañana',
          description: `${l.borrower_detail?.full_name || 'Usuario'} devuelve ${l.material_detail?.name || 'Material'}`,
          href: '/loans',
          priority: 'medium',
          date: l.expected_return_date || l.created_at || '',
        })
      })

    // Stock bajo (media prioridad)
    materials
      .filter((m: any) => m.is_low_stock)
      .forEach((m: any) => {
        result.push({
          id: `stock-${m.id}`,
          type: 'low_stock',
          title: 'Stock bajo',
          description: `${m.name}: ${m.quantity} uds. (mín: ${m.min_stock_level})`,
          href: '/materials',
          priority: 'medium',
          date: new Date().toISOString(),
        })
      })

    // Sort by priority → date desc
    const order: Record<string, number> = { high: 0, medium: 1, low: 2 }
    return result.sort((a, b) => {
      if (order[a.priority] !== order[b.priority]) return order[a.priority] - order[b.priority]
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })
  }, [requests, loans, materials])

  const { readIds, markRead, markAllRead } = useNotificationStore()

  const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length

  // Unread counts per href (for sidebar badges)
  const badgeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    notifications.forEach(n => {
      if (!readIds.includes(n.id)) {
        counts[n.href] = (counts[n.href] || 0) + 1
      }
    })
    return counts
  }, [notifications, readIds])

  return {
    notifications,
    unreadCount,
    readIds,
    badgeCounts,
    markRead,
    markAllRead: () => markAllRead(notifications.map(n => n.id)),
  }
}
