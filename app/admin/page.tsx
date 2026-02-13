'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import AdminLayout from '@/components/layout/AdminLayout'
import { Card, CardContent } from '@/components/ui'
import { Badge } from '@/components/ui'
import {
  Shield, Building2, Users, CreditCard, DollarSign,
  TrendingUp, Calendar,
} from 'lucide-react'
import { useAdminStats } from '@/hooks/useAdmin'

export default function AdminDashboardPage() {
  const router = useRouter()
  const { user } = useAuthStore()

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) { router.push('/login'); return }
    if (user && !user.is_superuser) { router.push('/dashboard'); return }
  }, [router, user])

  const { data: stats, isLoading } = useAdminStats()

  const formatCurrency = (amount: number) =>
    `$${amount.toFixed(2)} USD`

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
    })

  const getPlanLabel = (plan: string) => {
    const labels: Record<string, string> = {
      freemium: 'Freemium', monthly: 'Mensual',
      quarterly: 'Trimestral', annual: 'Anual',
    }
    return labels[plan] || plan
  }

  const statCards = stats ? [
    { label: 'Total Cuentas', value: stats.total_accounts, icon: Building2, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    { label: 'Cuentas Activas', value: stats.active_accounts, icon: Building2, color: 'text-green-400', bg: 'bg-green-500/20' },
    { label: 'Total Usuarios', value: stats.total_users, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/20' },
    { label: 'Usuarios Activos', value: stats.active_users, icon: Users, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
    { label: 'Ingresos Totales', value: formatCurrency(stats.total_revenue), icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-500/20' },
    { label: 'Ingresos del Mes', value: formatCurrency(stats.payments_this_month), icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  ] : []

  return (
    <AdminLayout>
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-xl border border-blue-500/20">
            <Shield className="h-7 w-7 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Panel de Administracion</h1>
            <p className="text-base text-muted-foreground mt-1">
              Vista general del sistema Pack-a-Stock
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-blue-400 mb-4"></div>
            <p className="text-base text-muted-foreground">Cargando estadisticas...</p>
          </div>
        ) : stats ? (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {statCards.map(({ label, value, icon: Icon, color, bg }) => (
                <div
                  key={label}
                  className="p-5 rounded-xl border-2 border-border/50 bg-card hover:border-blue-500/30 hover:bg-blue-500/5 transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-lg ${bg}`}>
                      <Icon className={`h-5 w-5 ${color}`} />
                    </div>
                    <span className={`text-3xl font-bold ${color}`}>
                      {value}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>

            {/* Plan Distribution */}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-3">
                <CreditCard className="h-6 w-6 text-blue-400" />
                Distribucion de Planes
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(stats.plan_distribution).map(([plan, count]) => (
                  <Card key={plan} className="border-2 border-border/50">
                    <CardContent className="p-5 text-center">
                      <p className="text-3xl font-bold text-foreground mb-2">{count as number}</p>
                      <Badge variant={plan === 'freemium' ? 'secondary' : 'success'} className="text-sm px-3 py-1">
                        {getPlanLabel(plan)}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Recent Payments */}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-3">
                <DollarSign className="h-6 w-6 text-blue-400" />
                Pagos Recientes
              </h2>
              {stats.recent_payments.length === 0 ? (
                <Card className="border-dashed border-2">
                  <CardContent className="p-10 text-center">
                    <CreditCard className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-base text-muted-foreground">No hay pagos registrados</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {stats.recent_payments.map((payment: any) => (
                    <Card key={payment.id} className="border-l-4 border-l-green-500 hover:shadow-xl transition-all duration-300">
                      <CardContent className="p-0">
                        <div className="flex items-center gap-4 p-5">
                          <div className="p-2.5 rounded-xl bg-green-500/10">
                            <DollarSign className="h-5 w-5 text-green-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-bold text-foreground">{payment.account_name}</p>
                            <p className="text-sm text-muted-foreground">{payment.plan_name}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-lg font-bold text-green-400">${payment.amount}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {formatDate(payment.paid_at)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </AdminLayout>
  )
}
