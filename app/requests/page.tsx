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
  Inbox,
  Clock,
  CheckCircle2,
  XCircle,
  User,
  Calendar,
  FileText,
  Package,
  MessageSquare,
  ArrowRight,
  CalendarClock,
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

interface LoanExtension {
  id: number
  loan: number
  material_name?: string
  requested_by_detail?: {
    full_name?: string
    email?: string
  }
  requested_at: string
  new_return_date: string
  reason: string
  status: string
}

export default function RequestsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [actionModal, setActionModal] = useState<{ type: 'approve' | 'reject'; request: LoanRequest } | null>(null)
  const [actionNotes, setActionNotes] = useState('')
  const [extModal, setExtModal] = useState<{ type: 'approve' | 'reject'; extension: LoanExtension } | null>(null)
  const [extNotes, setExtNotes] = useState('')

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

  const { data: extensionsResponse = [] } = useQuery({
    queryKey: ['loan-extensions-pending'],
    queryFn: async () => {
      const response = await api.get('/loans/loan-extensions/pending/')
      return response.data
    },
    refetchInterval: 30000,
  })

  const requests: LoanRequest[] = Array.isArray(requestsResponse)
    ? requestsResponse
    : requestsResponse?.results ?? []

  const pendingExtensions: LoanExtension[] = Array.isArray(extensionsResponse)
    ? extensionsResponse
    : extensionsResponse?.results ?? []

  const pendingRequests = useMemo(() =>
    requests.filter((r) => r.status === 'pending'),
  [requests])

  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      const response = await api.post(`/loans/loan-requests/${id}/approve/`, { notes })
      return response.data
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

  const approveExtMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      await api.post(`/loans/loan-extensions/${id}/approve/`, { notes })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-extensions-pending'] })
      toast.success('Extensión aprobada')
      setExtModal(null)
      setExtNotes('')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al aprobar extensión')
    },
  })

  const rejectExtMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      await api.post(`/loans/loan-extensions/${id}/reject/`, { notes })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-extensions-pending'] })
      toast.success('Extensión rechazada')
      setExtModal(null)
      setExtNotes('')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al rechazar extensión')
    },
  })

  const handleExtAction = () => {
    if (!extModal) return
    const { type, extension } = extModal
    if (type === 'approve') {
      approveExtMutation.mutate({ id: extension.id, notes: extNotes })
    } else {
      rejectExtMutation.mutate({ id: extension.id, notes: extNotes })
    }
  }

  const formatDate = (date?: string) => {
    if (!date) return '---'
    const d = new Date(date)
    const datePart = d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
    const hours = d.getHours()
    const minutes = d.getMinutes()
    if (hours === 0 && minutes === 0) return datePart
    const timePart = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true })
    return `${datePart} ${timePart}`
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl border border-primary/20">
              <Inbox className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">Solicitudes</h1>
              <p className="text-base text-muted-foreground mt-1">
                Solicitudes de empleados pendientes por revisar
              </p>
            </div>
          </div>
          {(pendingRequests.length + pendingExtensions.length) > 0 && (
            <Badge variant="warning" className="text-lg px-4 py-2">
              {pendingRequests.length + pendingExtensions.length} pendiente{(pendingRequests.length + pendingExtensions.length) !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-primary mb-4"></div>
            <p className="text-base text-muted-foreground">Cargando solicitudes...</p>
          </div>
        ) : pendingRequests.length === 0 && pendingExtensions.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="p-16 text-center">
              <div className="p-4 bg-secondary/30 rounded-2xl w-fit mx-auto mb-6">
                <CheckCircle2 className="h-14 w-14 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                Todo al dia
              </h3>
              <p className="text-base text-muted-foreground max-w-sm mx-auto">
                No hay solicitudes pendientes por revisar. Cuando un empleado solicite materiales o extensiones, apareceran aqui.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {pendingRequests.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Inbox className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Solicitudes de Préstamo</h2>
                  <p className="text-sm text-muted-foreground">Empleados que solicitan materiales</p>
                </div>
                <Badge variant="warning" className="ml-auto text-sm px-3 py-1">
                  {pendingRequests.length} pendiente{pendingRequests.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            )}
            {pendingRequests.map((req) => (
              <Card
                key={req.id}
                className="border-l-4 border-l-yellow-500 hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                <CardContent className="p-0">
                  <div className="flex flex-col gap-4 p-5">
                    {/* Header row */}
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-yellow-500/10">
                        <User className="h-6 w-6 text-yellow-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-bold text-foreground">
                          {req.requester_detail?.full_name || req.requester_detail?.email || 'N/D'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Solicitud #{req.id} · {formatDate(req.created_at)}
                        </p>
                      </div>
                      <Badge variant="warning" className="text-sm px-3 py-1">Pendiente</Badge>
                    </div>

                    {/* Materiales solicitados */}
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

                    {/* Info row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                          <Calendar className="h-4 w-4 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Periodo</p>
                          <p className="text-base font-medium text-foreground">
                            {formatDate(req.desired_pickup_date)}
                            <ArrowRight className="h-3.5 w-3.5 inline mx-1.5 text-muted-foreground" />
                            {formatDate(req.desired_return_date)}
                          </p>
                        </div>
                      </div>
                      {req.purpose && (
                        <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Motivo</p>
                            <p className="text-base font-medium text-foreground truncate">{req.purpose}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3 w-full pt-2 border-t border-border/30 mt-1">
                      <Button
                        onClick={() => { setActionModal({ type: 'approve', request: req }); setActionNotes('') }}
                        variant="primary"
                        size="lg"
                        className="w-full text-base py-3"
                      >
                        <CheckCircle2 className="h-5 w-5 mr-2" />
                        Aprobar
                      </Button>
                      <Button
                        onClick={() => { setActionModal({ type: 'reject', request: req }); setActionNotes('') }}
                        variant="destructive"
                        size="lg"
                        className="w-full text-base py-3"
                      >
                        <XCircle className="h-5 w-5 mr-2" />
                        Rechazar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Extensiones pendientes */}
        {pendingExtensions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <CalendarClock className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Solicitudes de Extensión</h2>
                <p className="text-sm text-muted-foreground">Empleados que solicitan más tiempo para su préstamo</p>
              </div>
              <Badge variant="warning" className="ml-auto text-sm px-3 py-1">
                {pendingExtensions.length} pendiente{pendingExtensions.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <div className="space-y-4">
              {pendingExtensions.map((ext) => (
                <Card key={ext.id} className="border-l-4 border-l-orange-400 hover:shadow-xl transition-all duration-300 overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex flex-col gap-4 p-5">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-orange-500/10">
                          <CalendarClock className="h-6 w-6 text-orange-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-bold text-foreground">
                            {ext.requested_by_detail?.full_name || ext.requested_by_detail?.email || 'N/D'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Extensión #{ext.id} · Préstamo #{ext.loan} · {formatDate(ext.requested_at)}
                          </p>
                        </div>
                        <Badge variant="warning" className="text-sm px-3 py-1">Pendiente</Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Package className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Material</p>
                            <p className="text-base font-medium text-foreground">{ext.material_name || '—'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                          <div className="p-2 bg-orange-500/10 rounded-lg">
                            <Calendar className="h-4 w-4 text-orange-400" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Nueva fecha</p>
                            <p className="text-base font-medium text-foreground">{formatDate(ext.new_return_date)}</p>
                          </div>
                        </div>
                      </div>

                      {ext.reason && (
                        <div className="flex items-start gap-3 p-3 bg-secondary/20 rounded-xl">
                          <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Motivo</p>
                            <p className="text-base font-medium text-foreground">{ext.reason}</p>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 w-full pt-2 border-t border-border/30 mt-1">
                        <Button
                          onClick={() => { setExtModal({ type: 'approve', extension: ext }); setExtNotes('') }}
                          variant="primary"
                          size="lg"
                          className="w-full text-base py-3"
                        >
                          <CheckCircle2 className="h-5 w-5 mr-2" />
                          Aprobar
                        </Button>
                        <Button
                          onClick={() => { setExtModal({ type: 'reject', extension: ext }); setExtNotes('') }}
                          variant="destructive"
                          size="lg"
                          className="w-full text-base py-3"
                        >
                          <XCircle className="h-5 w-5 mr-2" />
                          Rechazar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleAction}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  className="w-full text-base py-3"
                  variant={actionModal.type === 'reject' ? 'destructive' : 'primary'}
                  size="lg"
                >
                  {approveMutation.isPending || rejectMutation.isPending
                    ? 'Procesando...'
                    : actionModal.type === 'approve'
                    ? 'Confirmar'
                    : 'Rechazar'}
                </Button>
                <Button
                  onClick={() => { setActionModal(null); setActionNotes('') }}
                  variant="secondary"
                  size="lg"
                  className="w-full text-base py-3"
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Extension Modal */}
      {extModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg shadow-2xl border-2">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                {extModal.type === 'approve' ? (
                  <>
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    </div>
                    Aprobar Extensión #{extModal.extension.id}
                  </>
                ) : (
                  <>
                    <div className="p-2 bg-red-500/10 rounded-lg">
                      <XCircle className="h-6 w-6 text-red-500" />
                    </div>
                    Rechazar Extensión #{extModal.extension.id}
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="p-4 bg-secondary/20 rounded-xl space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Solicitante</p>
                    <p className="text-base font-semibold text-foreground">
                      {extModal.extension.requested_by_detail?.full_name || extModal.extension.requested_by_detail?.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <CalendarClock className="h-5 w-5 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Nueva fecha solicitada</p>
                    <p className="text-base font-semibold text-foreground">{formatDate(extModal.extension.new_return_date)}</p>
                  </div>
                </div>
                {extModal.extension.reason && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Motivo</p>
                      <p className="text-base font-medium text-foreground">{extModal.extension.reason}</p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  {extModal.type === 'reject' ? 'Motivo del rechazo' : 'Notas (opcional)'}
                </label>
                <textarea
                  value={extNotes}
                  onChange={(e) => setExtNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none transition-colors"
                  placeholder={extModal.type === 'approve' ? 'Notas adicionales...' : 'Escribe el motivo del rechazo...'}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleExtAction}
                  disabled={approveExtMutation.isPending || rejectExtMutation.isPending}
                  className="w-full text-base py-3"
                  variant={extModal.type === 'reject' ? 'destructive' : 'primary'}
                  size="lg"
                >
                  {approveExtMutation.isPending || rejectExtMutation.isPending
                    ? 'Procesando...'
                    : extModal.type === 'approve'
                    ? 'Confirmar'
                    : 'Rechazar'}
                </Button>
                <Button
                  onClick={() => { setExtModal(null); setExtNotes('') }}
                  variant="secondary"
                  size="lg"
                  className="w-full text-base py-3"
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
