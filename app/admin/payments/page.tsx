'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import AdminLayout from '@/components/layout/AdminLayout'
import { Card, CardContent } from '@/components/ui'
import { Badge } from '@/components/ui'
import {
  CreditCard, Search, Calendar, DollarSign, Building2,
} from 'lucide-react'
import { useAdminPayments } from '@/hooks/useAdmin'

export default function AdminPaymentsPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) { router.push('/login'); return }
    if (user && !user.is_superuser) { router.push('/dashboard'); return }
  }, [router, user])

  const { data: payments = [], isLoading } = useAdminPayments()

  const filteredPayments = payments.filter((p: any) => {
    const matchesSearch =
      p.account_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.card_holder_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.plan_name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === '' ? true : p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalFiltered = filteredPayments.reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0)

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })

  const getStatusBadge = (status: string) => {
    const map: Record<string, { variant: any; label: string }> = {
      completed: { variant: 'success', label: 'Completado' },
      failed: { variant: 'danger', label: 'Fallido' },
      refunded: { variant: 'warning', label: 'Reembolsado' },
    }
    const info = map[status] || { variant: 'default', label: status }
    return <Badge variant={info.variant} className="text-sm px-3 py-1">{info.label}</Badge>
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-xl border border-blue-500/20">
            <DollarSign className="h-7 w-7 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Pagos</h1>
            <p className="text-base text-muted-foreground mt-1">
              Historial completo de pagos del sistema
            </p>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por empresa, titular o plan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border-2 border-border bg-card px-5 py-3.5 pl-12 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border-2 border-border bg-card px-5 py-3.5 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors sm:w-52"
          >
            <option value="">Todos los estados</option>
            <option value="completed">Completados</option>
            <option value="failed">Fallidos</option>
            <option value="refunded">Reembolsados</option>
          </select>
        </div>

        {/* Summary */}
        {filteredPayments.length > 0 && (
          <div className="flex items-center justify-between px-1">
            <p className="text-sm text-muted-foreground">{filteredPayments.length} pago{filteredPayments.length !== 1 ? 's' : ''}</p>
            <p className="text-sm font-medium text-foreground">Total: <span className="text-green-400 font-bold">${totalFiltered.toFixed(2)} USD</span></p>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-blue-400 mb-4"></div>
            <p className="text-base text-muted-foreground">Cargando pagos...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="p-16 text-center">
              <DollarSign className="h-14 w-14 text-muted-foreground mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-foreground mb-3">No hay pagos registrados</h3>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {filteredPayments.map((payment: any) => (
              <Card
                key={payment.id}
                className={`border-l-4 ${payment.status === 'completed' ? 'border-l-green-500' : payment.status === 'failed' ? 'border-l-red-500' : 'border-l-amber-500'} hover:shadow-xl transition-all duration-300 overflow-hidden`}
              >
                <CardContent className="p-0">
                  <div className="flex flex-col gap-4 p-5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 rounded-xl bg-green-500/10">
                          <DollarSign className="h-6 w-6 text-green-400" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">{payment.account_name}</h3>
                        <div className="ml-auto flex items-center gap-2">
                          <span className="text-xl font-bold text-green-400">${payment.amount}</span>
                          {getStatusBadge(payment.status)}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                          <div className="p-2 bg-blue-500/10 rounded-lg">
                            <CreditCard className="h-4 w-4 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Plan</p>
                            <p className="text-base font-medium text-foreground">{payment.plan_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                          <div className="p-2 bg-purple-500/10 rounded-lg">
                            <CreditCard className="h-4 w-4 text-purple-400" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Tarjeta</p>
                            <p className="text-base font-medium text-foreground">****{payment.card_last_four}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                          <div className="p-2 bg-green-500/10 rounded-lg">
                            <Building2 className="h-4 w-4 text-green-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Titular</p>
                            <p className="text-base font-medium text-foreground truncate">{payment.card_holder_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                          <div className="p-2 bg-amber-500/10 rounded-lg">
                            <Calendar className="h-4 w-4 text-amber-400" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Fecha</p>
                            <p className="text-sm font-medium text-foreground">{formatDate(payment.paid_at)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
