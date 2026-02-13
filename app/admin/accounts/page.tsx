'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import AdminLayout from '@/components/layout/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import { Badge } from '@/components/ui'
import {
  Building2, Users, MapPin, CreditCard, Search,
  Edit2, X, Check, Calendar,
} from 'lucide-react'
import { useAdminAccounts, useAdminUpdateAccount } from '@/hooks/useAdmin'

export default function AdminAccountsPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editData, setEditData] = useState<any>({})

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) { router.push('/login'); return }
    if (user && !user.is_superuser) { router.push('/dashboard'); return }
  }, [router, user])

  const { data: accounts = [], isLoading } = useAdminAccounts()
  const updateMutation = useAdminUpdateAccount()

  const filteredAccounts = accounts.filter((acc: any) =>
    acc.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleEdit = (account: any) => {
    setEditingId(account.id)
    setEditData({
      subscription_plan: account.subscription_plan,
      max_users: account.max_users,
      max_locations: account.max_locations,
      is_active: account.is_active,
    })
  }

  const handleSave = () => {
    if (!editingId) return
    updateMutation.mutate(
      { id: editingId, updates: editData },
      { onSuccess: () => setEditingId(null) }
    )
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
    })

  const getPlanBadge = (plan: string) => {
    const variants: Record<string, any> = {
      freemium: 'secondary', monthly: 'info', quarterly: 'warning', annual: 'success',
    }
    const labels: Record<string, string> = {
      freemium: 'Freemium', monthly: 'Mensual', quarterly: 'Trimestral', annual: 'Anual',
    }
    return <Badge variant={variants[plan] || 'default'} className="text-sm px-3 py-1">{labels[plan] || plan}</Badge>
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-xl border border-blue-500/20">
            <Building2 className="h-7 w-7 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Cuentas</h1>
            <p className="text-base text-muted-foreground mt-1">
              Administra todas las cuentas del sistema
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border-2 border-border bg-card px-5 py-3.5 pl-12 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-blue-400 mb-4"></div>
            <p className="text-base text-muted-foreground">Cargando cuentas...</p>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="p-16 text-center">
              <Building2 className="h-14 w-14 text-muted-foreground mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-foreground mb-3">No se encontraron cuentas</h3>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {filteredAccounts.map((account: any) => (
              <Card
                key={account.id}
                className={`border-l-4 ${account.is_active ? 'border-l-blue-500' : 'border-l-red-500'} hover:shadow-xl transition-all duration-300 overflow-hidden`}
              >
                <CardContent className="p-0">
                  <div className="flex flex-col gap-4 p-5">
                    <div className="flex-1 min-w-0">
                      {/* Name + Badge */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 rounded-xl bg-blue-500/10">
                          <Building2 className="h-6 w-6 text-blue-400" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">{account.company_name}</h3>
                        <div className="ml-auto flex items-center gap-2">
                          {getPlanBadge(account.subscription_plan)}
                          <Badge variant={account.is_active ? 'success' : 'danger'} className="text-sm px-3 py-1">
                            {account.is_active ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                          <div className="p-2 bg-blue-500/10 rounded-lg">
                            <CreditCard className="h-4 w-4 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Email</p>
                            <p className="text-sm font-medium text-foreground truncate">{account.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                          <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Users className="h-4 w-4 text-purple-400" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Usuarios</p>
                            <p className="text-base font-medium text-foreground">
                              {account.user_count} / {account.max_users === -1 ? '∞' : account.max_users}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                          <div className="p-2 bg-green-500/10 rounded-lg">
                            <MapPin className="h-4 w-4 text-green-400" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Ubicaciones</p>
                            <p className="text-base font-medium text-foreground">
                              Max: {account.max_locations === -1 ? '∞' : account.max_locations}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                          <div className="p-2 bg-amber-500/10 rounded-lg">
                            <Calendar className="h-4 w-4 text-amber-400" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Creada</p>
                            <p className="text-sm font-medium text-foreground">{formatDate(account.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Edit Section */}
                    {editingId === account.id ? (
                      <div className="pt-3 border-t border-border/30 space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Plan</label>
                            <select
                              value={editData.subscription_plan}
                              onChange={(e) => setEditData({ ...editData, subscription_plan: e.target.value })}
                              className="w-full rounded-xl border-2 border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            >
                              <option value="freemium">Freemium</option>
                              <option value="monthly">Mensual</option>
                              <option value="quarterly">Trimestral</option>
                              <option value="annual">Anual</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Max Usuarios</label>
                            <input
                              type="number"
                              value={editData.max_users}
                              onChange={(e) => setEditData({ ...editData, max_users: parseInt(e.target.value) })}
                              className="w-full rounded-xl border-2 border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Max Ubicaciones</label>
                            <input
                              type="number"
                              value={editData.max_locations}
                              onChange={(e) => setEditData({ ...editData, max_locations: parseInt(e.target.value) })}
                              className="w-full rounded-xl border-2 border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Estado</label>
                            <select
                              value={editData.is_active ? 'true' : 'false'}
                              onChange={(e) => setEditData({ ...editData, is_active: e.target.value === 'true' })}
                              className="w-full rounded-xl border-2 border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            >
                              <option value="true">Activa</option>
                              <option value="false">Inactiva</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Button onClick={handleSave} disabled={updateMutation.isPending} size="lg" className="w-full text-base py-3 bg-blue-600 hover:bg-blue-700">
                            <Check className="h-5 w-5 mr-2" />
                            {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
                          </Button>
                          <Button onClick={() => setEditingId(null)} variant="secondary" size="lg" className="w-full text-base py-3">
                            <X className="h-5 w-5 mr-2" />
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-border/30 mt-2">
                        <Button onClick={() => handleEdit(account)} variant="secondary" size="lg" className="w-full text-base py-3">
                          <Edit2 className="h-5 w-5 mr-2" />
                          Editar Cuenta
                        </Button>
                      </div>
                    )}
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
