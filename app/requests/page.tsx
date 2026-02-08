'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import { Badge } from '@/components/ui'
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
  List,
  User,
  Calendar,
  FileText,
  Package,
  MessageSquare,
  ArrowRight,
  Hash,
} from 'lucide-react'

interface LoanRequestItem {
  id: number
  material: number
  quantity_requested: number
  material_detail?: {
    id: number
    name: string
  }
}

interface LoanRequest {
  id: number
  requester: number
  requester_detail?: {
    full_name?: string
    email?: string
  }
  desired_pickup_date?: string
  desired_return_date?: string
  purpose?: string
  status: string
  items: LoanRequestItem[]
  admin_notes?: string
  created_at?: string
}

type TabKey = 'pending' | 'approved' | 'rejected' | 'all'

const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'pending', label: 'Pendientes', icon: Clock },
  { key: 'approved', label: 'Aprobadas', icon: CheckCircle2 },
  { key: 'rejected', label: 'Rechazadas', icon: XCircle },
  { key: 'all', label: 'Todas', icon: List },
]

const statusConfig: Record<string, { label: string; variant: 'warning' | 'success' | 'danger' | 'secondary'; color: string }> = {
  pending: { label: 'Pendiente', variant: 'warning', color: 'border-l-yellow-500' },
  approved: { label: 'Aprobada', variant: 'success', color: 'border-l-green-500' },
  rejected: { label: 'Rechazada', variant: 'danger', color: 'border-l-red-500' },
}

export default function RequestsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabKey>('pending')
  const [actionModal, setActionModal] = useState<{ type: 'approve' | 'reject'; request: LoanRequest } | null>(null)
  const [actionNotes, setActionNotes] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
    }
  }, [router])

  const { data: requestsResponse = [], isLoading } = useQuery({
    queryKey: ['loan-requests'],
    queryFn: async () => {
      const response = await api.get('/loans/loan-requests/')
      return response.data
    },
  })

  const requests: LoanRequest[] = Array.isArray(requestsResponse)
    ? requestsResponse
    : requestsResponse?.results ?? []

  const counts = useMemo(() => ({
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
    all: requests.length,
  }), [requests])

  const filteredRequests = useMemo(() => {
    if (activeTab === 'all') return requests
    return requests.filter((req) => req.status === activeTab)
  }, [activeTab, requests])

  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      await api.post(`/loans/loan-requests/${id}/approve/`, { notes })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-requests'] })
      toast.success('Solicitud aprobada')
      setActionModal(null)
      setActionNotes('')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al aprobar solicitud')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      await api.post(`/loans/loan-requests/${id}/reject/`, { notes })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-requests'] })
      toast.success('Solicitud rechazada')
      setActionModal(null)
      setActionNotes('')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al rechazar solicitud')
    },
  })

  const handleAction = () => {
    if (!actionModal) return
    const { type, request } = actionModal
    if (type === 'approve') {
      approveMutation.mutate({ id: request.id, notes: actionNotes })
    } else {
      rejectMutation.mutate({ id: request.id, notes: actionNotes })
    }
  }

  const formatDate = (date?: string) => {
    if (!date) return '---'
    return new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl border border-primary/20">
            <ClipboardList className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Solicitudes de Prestamo</h1>
            <p className="text-base text-muted-foreground mt-1">
              Revisa y gestiona las solicitudes de prestamo
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {tabs.map(({ key, label, icon: Icon }) => {
            const isActive = activeTab === key
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`relative p-5 rounded-xl border-2 transition-all duration-200 text-left ${
                  isActive
                    ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10'
                    : 'border-border/50 bg-card hover:border-primary/30 hover:bg-primary/5'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg ${isActive ? 'bg-primary/20' : 'bg-secondary/50'}`}>
                    <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <span className={`text-3xl font-bold ${isActive ? 'text-primary' : 'text-foreground'}`}>
                    {counts[key]}
                  </span>
                </div>
                <p className={`text-sm font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  {label}
                </p>
              </button>
            )
          })}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-primary mb-4"></div>
            <p className="text-base text-muted-foreground">Cargando solicitudes...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="p-16 text-center">
              <div className="p-4 bg-secondary/30 rounded-2xl w-fit mx-auto mb-6">
                <ClipboardList className="h-14 w-14 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                Sin solicitudes
              </h3>
              <p className="text-base text-muted-foreground max-w-sm mx-auto">
                No hay solicitudes en esta categoria por el momento.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {filteredRequests.map((req) => {
              const cfg = statusConfig[req.status] || { label: req.status, variant: 'secondary' as const, color: 'border-l-gray-500' }
              return (
                <Card
                  key={req.id}
                  className={`border-l-4 ${cfg.color} hover:shadow-xl transition-all duration-300 overflow-hidden`}
                >
                  <CardContent className="p-0">
                    {/* Card Header Row */}
                    <div className="flex items-center justify-between p-5 pb-0">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Hash className="h-5 w-5 text-primary" />
                          <span className="text-xl font-bold text-foreground">
                            {req.id}
                          </span>
                        </div>
                        <Badge variant={cfg.variant} className="text-sm px-3 py-1">
                          {cfg.label}
                        </Badge>
                      </div>
                      {req.created_at && (
                        <span className="text-sm text-muted-foreground">
                          {formatDate(req.created_at)}
                        </span>
                      )}
                    </div>

                    {/* Card Body */}
                    <div className="p-5 pt-4 space-y-5">
                      {/* Info Row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Solicitante */}
                        <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Solicitante</p>
                            <p className="text-base font-semibold text-foreground mt-0.5">
                              {req.requester_detail?.full_name || req.requester_detail?.email || 'N/D'}
                            </p>
                          </div>
                        </div>

                        {/* Fechas */}
                        <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Calendar className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Periodo</p>
                            <p className="text-base font-semibold text-foreground mt-0.5">
                              {formatDate(req.desired_pickup_date)}
                              <ArrowRight className="h-3.5 w-3.5 inline mx-1.5 text-muted-foreground" />
                              {formatDate(req.desired_return_date)}
                            </p>
                          </div>
                        </div>

                        {/* Motivo */}
                        {req.purpose && (
                          <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Motivo</p>
                              <p className="text-base font-semibold text-foreground mt-0.5 truncate">
                                {req.purpose}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Items + Actions Row */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Items */}
                        <div className="flex flex-wrap gap-2.5">
                          {req.items?.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl"
                            >
                              <Package className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium text-foreground">
                                {item.material_detail?.name || `Material ${item.material}`}
                              </span>
                              <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                                x{item.quantity_requested}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Actions */}
                        {req.status === 'pending' && (
                          <div className="flex gap-3 flex-shrink-0">
                            <Button
                              onClick={() => { setActionModal({ type: 'approve', request: req }); setActionNotes('') }}
                              size="lg"
                              className="bg-green-600 hover:bg-green-700 text-base px-6"
                            >
                              <CheckCircle2 className="h-5 w-5 mr-2" />
                              Aprobar
                            </Button>
                            <Button
                              onClick={() => { setActionModal({ type: 'reject', request: req }); setActionNotes('') }}
                              variant="destructive"
                              size="lg"
                              className="text-base px-6"
                            >
                              <XCircle className="h-5 w-5 mr-2" />
                              Rechazar
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg shadow-2xl border-2">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                {actionModal.type === 'approve' ? (
                  <>
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    </div>
                    Aprobar Solicitud #{actionModal.request.id}
                  </>
                ) : (
                  <>
                    <div className="p-2 bg-red-500/10 rounded-lg">
                      <XCircle className="h-6 w-6 text-red-500" />
                    </div>
                    Rechazar Solicitud #{actionModal.request.id}
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Solicitante */}
              <div className="p-4 bg-secondary/20 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Solicitante</p>
                    <p className="text-base font-semibold text-foreground">
                      {actionModal.request.requester_detail?.full_name || actionModal.request.requester_detail?.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Materiales solicitados</p>
                <div className="space-y-2">
                  {actionModal.request.items?.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-secondary/20 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Package className="h-4 w-4 text-primary" />
                        <span className="text-base font-medium text-foreground">
                          {item.material_detail?.name || `Material ${item.material}`}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg">
                        x{item.quantity_requested}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  {actionModal.type === 'reject' ? 'Motivo del rechazo' : 'Notas (opcional)'}
                </label>
                <textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none transition-colors"
                  placeholder={actionModal.type === 'approve' ? 'Notas adicionales...' : 'Escribe el motivo del rechazo...'}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-3">
                <Button
                  onClick={handleAction}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  className={`flex-1 text-base py-3 ${actionModal.type === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                  variant={actionModal.type === 'reject' ? 'destructive' : 'default'}
                  size="lg"
                >
                  {approveMutation.isPending || rejectMutation.isPending
                    ? 'Procesando...'
                    : actionModal.type === 'approve'
                    ? 'Confirmar Aprobacion'
                    : 'Confirmar Rechazo'}
                </Button>
                <Button
                  onClick={() => { setActionModal(null); setActionNotes('') }}
                  variant="secondary"
                  size="lg"
                  className="text-base px-6"
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  )
}
