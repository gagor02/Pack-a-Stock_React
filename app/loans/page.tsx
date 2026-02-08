'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui'
import { Badge } from '@/components/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Input } from '@/components/ui'
import {
  useLoanRequests,
  useMyRequests,
  useApproveLoanRequest,
  useRejectLoanRequest,
  useLoans,
  useMyLoans,
  useReturnLoan,
  useLoanExtensions,
  useApproveExtension,
  useRejectExtension,
} from '@/hooks/useLoans'
import {
  ArrowLeftRight,
  Calendar,
  CheckCircle,
  XCircle,
  Package,
  User,
  ShieldBan,
  AlertTriangle,
  Plus,
  Clock,
  RotateCcw,
  Inbox,
  ClipboardList,
} from 'lucide-react'
import api from '@/lib/api'
import toast from 'react-hot-toast'

type TabKey = 'my-requests' | 'all-requests' | 'my-loans' | 'all-loans' | 'extensions'

interface ApprovalModalState {
  isOpen: boolean
  type: 'approve' | 'reject'
  id: number
  notes: string
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

export default function LoansPage() {
  const { user } = useAuthStore()
  const isInventarista = user?.user_type === 'inventarista'

  const [activeTab, setActiveTab] = useState<TabKey>(
    isInventarista ? 'all-requests' : 'my-requests'
  )
  const [approvalModal, setApprovalModal] = useState<ApprovalModalState>({
    isOpen: false,
    type: 'approve',
    id: 0,
    notes: '',
  })
  const [returnModal, setReturnModal] = useState<ReturnModalState>({
    isOpen: false,
    loanId: null,
    condition: 'good',
    notes: '',
  })
  const [penaltyModal, setPenaltyModal] = useState<PenaltyModalState>({
    isOpen: false,
    userId: null,
    userName: '',
    reason: '',
    daysBlocked: 7,
    isSubmitting: false,
  })

  // Queries
  const { data: myRequestsData, isLoading: loadingMyRequests } = useMyRequests()
  const { data: allRequestsData, isLoading: loadingAllRequests } =
    useLoanRequests()
  const { data: myLoansData, isLoading: loadingMyLoans } = useMyLoans()
  const { data: allLoansData, isLoading: loadingAllLoans } = useLoans()
  const { data: extensionsData, isLoading: loadingExtensions } =
    useLoanExtensions()

  // Mutations
  const approveMutation = useApproveLoanRequest()
  const rejectMutation = useRejectLoanRequest()
  const returnMutation = useReturnLoan()
  const approveExtensionMutation = useApproveExtension()
  const rejectExtensionMutation = useRejectExtension()

  // Extract data arrays
  const myRequests = Array.isArray(myRequestsData)
    ? myRequestsData
    : myRequestsData?.results ?? []
  const allRequests = Array.isArray(allRequestsData)
    ? allRequestsData
    : allRequestsData?.results ?? []
  const myLoans = Array.isArray(myLoansData) ? myLoansData : myLoansData?.results ?? []
  const allLoans = Array.isArray(allLoansData)
    ? allLoansData
    : allLoansData?.results ?? []
  const extensions = Array.isArray(extensionsData)
    ? extensionsData
    : extensionsData?.results ?? []

  // Handlers
  const handleOpenApprovalModal = (type: 'approve' | 'reject', id: number) => {
    setApprovalModal({ isOpen: true, type, id, notes: '' })
  }

  const handleCloseApprovalModal = () => {
    setApprovalModal({ isOpen: false, type: 'approve', id: 0, notes: '' })
  }

  const handleSubmitApproval = () => {
    if (approvalModal.type === 'approve') {
      approveMutation.mutate(
        { id: approvalModal.id, notes: approvalModal.notes },
        {
          onSuccess: () => handleCloseApprovalModal(),
        }
      )
    } else {
      rejectMutation.mutate(
        { id: approvalModal.id, reason: approvalModal.notes },
        {
          onSuccess: () => handleCloseApprovalModal(),
        }
      )
    }
  }

  const handleOpenReturnModal = (loanId: number) => {
    setReturnModal({ isOpen: true, loanId, condition: 'good', notes: '' })
  }

  const handleCloseReturnModal = () => {
    setReturnModal({ isOpen: false, loanId: null, condition: 'good', notes: '' })
  }

  const handleSubmitReturn = () => {
    if (!returnModal.loanId) return
    returnMutation.mutate(
      {
        id: returnModal.loanId,
        returnData: {
          condition: returnModal.condition,
          damage_notes: returnModal.notes,
        },
      },
      {
        onSuccess: () => handleCloseReturnModal(),
      }
    )
  }

  const handleApproveExtension = (id: number, notes?: string) => {
    approveExtensionMutation.mutate({ id, notes })
  }

  const handleRejectExtension = (id: number, reason: string) => {
    rejectExtensionMutation.mutate({ id, reason })
  }

  const handleOpenPenaltyModal = (loan: any) => {
    const userName =
      loan.borrower_detail?.full_name ||
      loan.borrower_detail?.email ||
      'Usuario desconocido'
    setPenaltyModal({
      isOpen: true,
      userId: loan.borrower,
      userName,
      reason: `Prestamo #${loan.id} vencido - Material: ${loan.material_detail?.name || 'N/D'}`,
      daysBlocked: 7,
      isSubmitting: false,
    })
  }

  const handleClosePenaltyModal = () => {
    setPenaltyModal({
      isOpen: false,
      userId: null,
      userName: '',
      reason: '',
      daysBlocked: 7,
      isSubmitting: false,
    })
  }

  const handleSubmitPenalty = async () => {
    if (!penaltyModal.userId || !penaltyModal.reason) return

    setPenaltyModal((prev) => ({ ...prev, isSubmitting: true }))
    try {
      const blockedUntil = new Date()
      blockedUntil.setDate(blockedUntil.getDate() + penaltyModal.daysBlocked)

      await api.put(`/auth/users/${penaltyModal.userId}/block/`, {
        blocked_reason: penaltyModal.reason,
        blocked_until: blockedUntil.toISOString(),
      })
      toast.success(`Usuario penalizado por ${penaltyModal.daysBlocked} dias`)
      handleClosePenaltyModal()
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          error.response?.data?.detail ||
          'Error al penalizar usuario'
      )
      setPenaltyModal((prev) => ({ ...prev, isSubmitting: false }))
    }
  }

  // Helper functions
  const getStatusBadgeVariant = (
    status: string
  ): 'default' | 'success' | 'warning' | 'danger' => {
    switch (status) {
      case 'approved':
      case 'active':
        return 'success'
      case 'pending':
        return 'warning'
      case 'rejected':
      case 'overdue':
      case 'lost':
        return 'danger'
      default:
        return 'default'
    }
  }

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      approved: 'Aprobado',
      rejected: 'Rechazado',
      active: 'Activo',
      overdue: 'Vencido',
      returned: 'Devuelto',
      lost: 'Perdido',
    }
    return labels[status] || status
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'approved':
      case 'active':
        return 'border-l-green-500'
      case 'pending':
        return 'border-l-yellow-500'
      case 'rejected':
      case 'lost':
        return 'border-l-red-500'
      case 'overdue':
        return 'border-l-red-500'
      case 'returned':
        return 'border-l-blue-500'
      default:
        return 'border-l-primary'
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/D'
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  // Tabs configuration
  const tabs: { key: TabKey; label: string; icon: any; count: number; visible: boolean }[] = [
    { key: 'my-requests', label: 'Mis Solicitudes', icon: ClipboardList, count: myRequests.length, visible: true },
    { key: 'all-requests', label: 'Solicitudes', icon: Inbox, count: allRequests.filter((r: any) => r.status === 'pending').length, visible: isInventarista },
    { key: 'my-loans', label: 'Mis Prestamos', icon: Package, count: myLoans.length, visible: true },
    { key: 'all-loans', label: 'Prestamos', icon: ArrowLeftRight, count: allLoans.length, visible: isInventarista },
    { key: 'extensions', label: 'Extensiones', icon: Clock, count: extensions.filter((e: any) => e.status === 'pending').length, visible: true },
  ].filter((tab) => tab.visible)

  // Loading spinner
  const Spinner = () => (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-primary mb-4"></div>
      <p className="text-base text-muted-foreground">Cargando...</p>
    </div>
  )

  // Empty state
  const EmptyState = ({ message }: { message: string }) => (
    <Card className="border-dashed border-2">
      <CardContent className="p-16 text-center">
        <div className="p-4 bg-secondary/30 rounded-2xl w-fit mx-auto mb-6">
          <Package className="h-14 w-14 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-3">Sin resultados</h3>
        <p className="text-base text-muted-foreground max-w-sm mx-auto">{message}</p>
      </CardContent>
    </Card>
  )

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl border border-primary/20">
              <ArrowLeftRight className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">Prestamos</h1>
              <p className="text-base text-muted-foreground mt-1">
                Solicitudes, prestamos y extensiones
              </p>
            </div>
          </div>
          {isInventarista && (
            <Link href="/loans/new">
              <Button size="lg" className="text-base px-6">
                <Plus className="h-5 w-5 mr-2" />
                Nuevo Prestamo
              </Button>
            </Link>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1.5 bg-secondary/30 rounded-xl overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-base font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-card text-foreground shadow-md border border-border/50'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`min-w-[1.5rem] h-6 flex items-center justify-center rounded-full text-sm font-semibold px-2 ${
                    isActive ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* My Requests Tab */}
        {activeTab === 'my-requests' && (
          <>
            {loadingMyRequests ? <Spinner /> : myRequests.length === 0 ? (
              <EmptyState message="No tienes solicitudes de prestamo" />
            ) : (
              <div className="space-y-5">
                {myRequests.map((req: any) => (
                  <Card
                    key={req.id}
                    className={`border-l-4 ${getStatusColor(req.status)} hover:shadow-xl transition-all duration-300 overflow-hidden`}
                  >
                    <CardContent className="p-0">
                      <div className="flex flex-col gap-4 p-5">
                        <div className="flex-1 min-w-0">
                          {/* Name + Badge */}
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-primary/10">
                              <Package className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground">
                              {req.material_detail?.name || `Material #${req.material}`}
                            </h3>
                            <div className="ml-auto flex items-center gap-2">
                              <Badge variant={getStatusBadgeVariant(req.status)} className="text-sm px-3 py-1">
                                {getStatusLabel(req.status)}
                              </Badge>
                              <span className="text-sm text-muted-foreground font-medium">#{req.id}</span>
                            </div>
                          </div>

                          {/* Details */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                              <div className="p-2 bg-primary/10 rounded-lg">
                                <Package className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Cantidad</p>
                                <p className="text-base font-medium text-foreground">x{req.quantity_requested}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                              <div className="p-2 bg-blue-500/10 rounded-lg">
                                <Calendar className="h-4 w-4 text-blue-400" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Devolucion</p>
                                <p className="text-base font-medium text-foreground">{formatDate(req.desired_return_date)}</p>
                              </div>
                            </div>
                            {req.purpose && (
                              <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                                <div className="p-2 bg-green-500/10 rounded-lg">
                                  <ClipboardList className="h-4 w-4 text-green-400" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Motivo</p>
                                  <p className="text-base font-medium text-foreground truncate">{req.purpose}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* All Requests Tab */}
        {activeTab === 'all-requests' && isInventarista && (
          <>
            {loadingAllRequests ? <Spinner /> : allRequests.length === 0 ? (
              <EmptyState message="No hay solicitudes pendientes" />
            ) : (
              <div className="space-y-5">
                {allRequests.map((req: any) => (
                  <Card
                    key={req.id}
                    className={`border-l-4 ${getStatusColor(req.status)} hover:shadow-xl transition-all duration-300 overflow-hidden`}
                  >
                    <CardContent className="p-0">
                      <div className="flex flex-col gap-4 p-5">
                        <div className="flex-1 min-w-0">
                          {/* Name + Badge */}
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-primary/10">
                              <User className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground">
                              {req.requester_detail?.full_name || req.requester_detail?.email || 'N/D'}
                            </h3>
                            <div className="ml-auto flex items-center gap-2">
                              <Badge variant={getStatusBadgeVariant(req.status)} className="text-sm px-3 py-1">
                                {getStatusLabel(req.status)}
                              </Badge>
                              <span className="text-sm text-muted-foreground font-medium">#{req.id}</span>
                            </div>
                          </div>

                          {/* Details */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                              <div className="p-2 bg-primary/10 rounded-lg">
                                <Package className="h-4 w-4 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Material</p>
                                <p className="text-base font-medium text-foreground truncate">{req.material_detail?.name || `#${req.material}`}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                              <div className="p-2 bg-blue-500/10 rounded-lg">
                                <Package className="h-4 w-4 text-blue-400" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Cantidad</p>
                                <p className="text-base font-medium text-foreground">x{req.quantity_requested}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                              <div className="p-2 bg-green-500/10 rounded-lg">
                                <Calendar className="h-4 w-4 text-green-400" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Devolucion</p>
                                <p className="text-base font-medium text-foreground">{formatDate(req.desired_return_date)}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        {req.status === 'pending' && (
                          <div className="grid grid-cols-2 gap-3 w-full pt-2 border-t border-border/30 mt-2">
                            <Button
                              onClick={() => handleOpenApprovalModal('approve', req.id)}
                              variant="primary"
                              size="lg"
                              className="w-full text-base py-3"
                            >
                              <CheckCircle className="h-5 w-5 mr-2" />
                              Aprobar
                            </Button>
                            <Button
                              onClick={() => handleOpenApprovalModal('reject', req.id)}
                              variant="destructive"
                              size="lg"
                              className="w-full text-base py-3"
                            >
                              <XCircle className="h-5 w-5 mr-2" />
                              Rechazar
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* My Loans Tab */}
        {activeTab === 'my-loans' && (
          <>
            {loadingMyLoans ? <Spinner /> : myLoans.length === 0 ? (
              <EmptyState message="No tienes prestamos activos" />
            ) : (
              <div className="space-y-5">
                {myLoans.map((loan: any) => (
                  <Card
                    key={loan.id}
                    className={`border-l-4 ${getStatusColor(loan.status)} ${loan.is_overdue ? 'border-2 border-destructive/30' : ''} hover:shadow-xl transition-all duration-300 overflow-hidden`}
                  >
                    <CardContent className="p-0">
                      <div className="flex flex-col gap-4 p-5">
                        <div className="flex-1 min-w-0">
                          {/* Name + Badge */}
                          <div className="flex items-center gap-3 mb-4">
                            <div className={`p-2.5 rounded-xl ${loan.is_overdue ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                              <Package className={`h-6 w-6 ${loan.is_overdue ? 'text-destructive' : 'text-primary'}`} />
                            </div>
                            <h3 className="text-lg font-bold text-foreground">
                              {loan.material_detail?.name || `Material #${loan.material}`}
                            </h3>
                            <div className="ml-auto flex items-center gap-2">
                              <Badge variant={getStatusBadgeVariant(loan.status)} className="text-sm px-3 py-1">
                                {getStatusLabel(loan.status)}
                              </Badge>
                            </div>
                          </div>

                          {/* Details */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                              <div className="p-2 bg-primary/10 rounded-lg">
                                <Package className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Cantidad</p>
                                <p className="text-base font-medium text-foreground">x{loan.quantity_loaned}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                              <div className="p-2 bg-blue-500/10 rounded-lg">
                                <Calendar className="h-4 w-4 text-blue-400" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Devolver</p>
                                <p className="text-base font-medium text-foreground">{formatDate(loan.expected_return_date)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                              <div className={`p-2 rounded-lg ${loan.is_overdue ? 'bg-destructive/10' : 'bg-green-500/10'}`}>
                                <Clock className={`h-4 w-4 ${loan.is_overdue ? 'text-destructive' : 'text-green-400'}`} />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Tiempo</p>
                                <p className={`text-base font-medium ${loan.is_overdue ? 'text-destructive' : 'text-foreground'}`}>
                                  {loan.days_until_return} dias
                                </p>
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
          </>
        )}

        {/* All Loans Tab */}
        {activeTab === 'all-loans' && isInventarista && (
          <>
            {loadingAllLoans ? <Spinner /> : allLoans.length === 0 ? (
              <EmptyState message="No hay prestamos registrados" />
            ) : (
              <div className="space-y-5">
                {allLoans.map((loan: any) => (
                  <Card
                    key={loan.id}
                    className={`border-l-4 ${getStatusColor(loan.status)} ${loan.is_overdue ? 'border-2 border-destructive/30' : ''} hover:shadow-xl transition-all duration-300 overflow-hidden`}
                  >
                    <CardContent className="p-0">
                      <div className="flex flex-col gap-4 p-5">
                        <div className="flex-1 min-w-0">
                          {/* Name + Badge */}
                          <div className="flex items-center gap-3 mb-4">
                            <div className={`p-2.5 rounded-xl ${loan.is_overdue ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                              {loan.is_overdue ? (
                                <AlertTriangle className="h-6 w-6 text-destructive" />
                              ) : (
                                <Package className="h-6 w-6 text-primary" />
                              )}
                            </div>
                            <h3 className="text-lg font-bold text-foreground">
                              {loan.material_detail?.name || `Material #${loan.material}`}
                            </h3>
                            <div className="ml-auto flex items-center gap-2">
                              <Badge variant={getStatusBadgeVariant(loan.status)} className="text-sm px-3 py-1">
                                {getStatusLabel(loan.status)}
                              </Badge>
                            </div>
                          </div>

                          {/* Details */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                              <div className="p-2 bg-primary/10 rounded-lg">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Usuario</p>
                                <p className="text-base font-medium text-foreground truncate">
                                  {loan.borrower_detail?.full_name || loan.borrower_detail?.email || 'N/D'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                              <div className="p-2 bg-blue-500/10 rounded-lg">
                                <Package className="h-4 w-4 text-blue-400" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Cantidad</p>
                                <p className="text-base font-medium text-foreground">x{loan.quantity_loaned}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                              <div className="p-2 bg-green-500/10 rounded-lg">
                                <Calendar className="h-4 w-4 text-green-400" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Devolver</p>
                                <p className="text-base font-medium text-foreground">{formatDate(loan.expected_return_date)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                              <div className={`p-2 rounded-lg ${loan.is_overdue ? 'bg-destructive/10' : 'bg-orange-500/10'}`}>
                                <Clock className={`h-4 w-4 ${loan.is_overdue ? 'text-destructive' : 'text-orange-400'}`} />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Tiempo</p>
                                <p className={`text-base font-medium ${loan.is_overdue ? 'text-destructive' : 'text-foreground'}`}>
                                  {loan.days_until_return} dias
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        {(loan.status === 'active' || loan.status === 'overdue') && (
                          <div className={`grid ${loan.status === 'overdue' && !loan.is_consumable_loan ? 'grid-cols-2' : 'grid-cols-1'} gap-3 w-full pt-2 border-t border-border/30 mt-2`}>
                            {!loan.is_consumable_loan && (
                              <Button
                                onClick={() => handleOpenReturnModal(loan.id)}
                                variant="primary"
                                size="lg"
                                className="w-full text-base py-3"
                              >
                                <RotateCcw className="h-5 w-5 mr-2" />
                                Registrar Devolucion
                              </Button>
                            )}
                            {loan.status === 'overdue' && (
                              <Button
                                onClick={() => handleOpenPenaltyModal(loan)}
                                variant="destructive"
                                size="lg"
                                className="w-full text-base py-3"
                              >
                                <ShieldBan className="h-5 w-5 mr-2" />
                                Penalizar
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Extensions Tab */}
        {activeTab === 'extensions' && (
          <>
            {loadingExtensions ? <Spinner /> : extensions.length === 0 ? (
              <EmptyState message="No hay solicitudes de extension" />
            ) : (
              <div className="space-y-5">
                {extensions.map((ext: any) => (
                  <Card
                    key={ext.id}
                    className={`border-l-4 ${getStatusColor(ext.status)} hover:shadow-xl transition-all duration-300 overflow-hidden`}
                  >
                    <CardContent className="p-0">
                      <div className="flex flex-col gap-4 p-5">
                        <div className="flex-1 min-w-0">
                          {/* Name + Badge */}
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-primary/10">
                              <Clock className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground">
                              {ext.requested_by_detail?.full_name || ext.requested_by_detail?.email || 'N/D'}
                            </h3>
                            <div className="ml-auto flex items-center gap-2">
                              <Badge variant={getStatusBadgeVariant(ext.status)} className="text-sm px-3 py-1">
                                {getStatusLabel(ext.status)}
                              </Badge>
                            </div>
                          </div>

                          {/* Details */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                              <div className="p-2 bg-primary/10 rounded-lg">
                                <ArrowLeftRight className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Prestamo</p>
                                <p className="text-base font-medium text-foreground">#{ext.loan}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                              <div className="p-2 bg-blue-500/10 rounded-lg">
                                <Calendar className="h-4 w-4 text-blue-400" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Nueva Fecha</p>
                                <p className="text-base font-medium text-foreground">{formatDate(ext.new_return_date)}</p>
                              </div>
                            </div>
                            {ext.reason && (
                              <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                                <div className="p-2 bg-green-500/10 rounded-lg">
                                  <ClipboardList className="h-4 w-4 text-green-400" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Motivo</p>
                                  <p className="text-base font-medium text-foreground truncate">{ext.reason}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        {ext.status === 'pending' && isInventarista && (
                          <div className="grid grid-cols-2 gap-3 w-full pt-2 border-t border-border/30 mt-2">
                            <Button
                              onClick={() => handleApproveExtension(ext.id)}
                              variant="primary"
                              size="lg"
                              className="w-full text-base py-3"
                            >
                              <CheckCircle className="h-5 w-5 mr-2" />
                              Aprobar
                            </Button>
                            <Button
                              onClick={() => handleRejectExtension(ext.id, 'Rechazado')}
                              variant="destructive"
                              size="lg"
                              className="w-full text-base py-3"
                            >
                              <XCircle className="h-5 w-5 mr-2" />
                              Rechazar
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Approval Modal */}
        {approvalModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md border-2 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className={`p-2 rounded-lg ${approvalModal.type === 'approve' ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
                    {approvalModal.type === 'approve' ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-destructive" />
                    )}
                  </div>
                  {approvalModal.type === 'approve' ? 'Aprobar' : 'Rechazar'} Solicitud
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 uppercase tracking-wider">
                    {approvalModal.type === 'approve' ? 'Notas (opcional)' : 'Motivo del rechazo'}
                  </label>
                  <textarea
                    value={approvalModal.notes}
                    onChange={(e) =>
                      setApprovalModal((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    className="w-full min-h-[120px] rounded-xl border-2 border-border bg-card px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    placeholder={
                      approvalModal.type === 'approve'
                        ? 'Notas adicionales (opcional)...'
                        : 'Motivo del rechazo...'
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handleSubmitApproval}
                    disabled={approvalModal.type === 'reject' && !approvalModal.notes}
                    size="lg"
                    className="w-full text-base py-3"
                    variant={approvalModal.type === 'approve' ? 'primary' : 'destructive'}
                  >
                    Confirmar
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleCloseApprovalModal}
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

        {/* Return Modal */}
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
                    Condicion
                  </label>
                  <select
                    value={returnModal.condition}
                    onChange={(e) =>
                      setReturnModal((prev) => ({ ...prev, condition: e.target.value }))
                    }
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
                    onChange={(e) =>
                      setReturnModal((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    className="w-full min-h-[100px] rounded-xl border-2 border-border bg-card px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    placeholder="Observaciones..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={handleSubmitReturn} size="lg" className="w-full text-base py-3">
                    Confirmar
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleCloseReturnModal}
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

        {/* Penalty Modal */}
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
                        onClick={() => setPenaltyModal((prev) => ({ ...prev, daysBlocked: days }))}
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
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={penaltyModal.daysBlocked}
                    onChange={(e) =>
                      setPenaltyModal((prev) => ({
                        ...prev,
                        daysBlocked: parseInt(e.target.value) || 1,
                      }))
                    }
                    placeholder="Personalizado"
                    className="mt-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 uppercase tracking-wider">
                    Motivo
                  </label>
                  <textarea
                    value={penaltyModal.reason}
                    onChange={(e) =>
                      setPenaltyModal((prev) => ({ ...prev, reason: e.target.value }))
                    }
                    className="w-full min-h-[100px] rounded-xl border-2 border-border bg-card px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
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
                  <Button
                    variant="secondary"
                    onClick={handleClosePenaltyModal}
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
      </div>
    </DashboardLayout>
  )
}
