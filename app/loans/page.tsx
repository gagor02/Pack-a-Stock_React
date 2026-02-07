'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui'
import { Badge } from '@/components/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
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
} from 'lucide-react'

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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/D'
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // Tabs configuration
  const tabs: { key: TabKey; label: string; visible: boolean }[] = [
    { key: 'my-requests', label: 'Mis Solicitudes', visible: true },
    {
      key: 'all-requests',
      label: 'Todas las Solicitudes',
      visible: isInventarista,
    },
    { key: 'my-loans', label: 'Mis Préstamos', visible: true },
    { key: 'all-loans', label: 'Todos los Préstamos', visible: isInventarista },
    { key: 'extensions', label: 'Extensiones', visible: true },
  ].filter((tab) => tab.visible)

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ArrowLeftRight className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Préstamos</h1>
              <p className="text-sm text-muted-foreground">
                Gestiona solicitudes, préstamos activos y extensiones
              </p>
            </div>
          </div>
          <Link href="/loans/new">
            <Button>
              <Package className="h-4 w-4 mr-2" />
              Nueva Solicitud
            </Button>
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* My Requests Tab */}
        {activeTab === 'my-requests' && (
          <div className="space-y-4">
            {loadingMyRequests && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Cargando solicitudes...
                </CardContent>
              </Card>
            )}
            {!loadingMyRequests && myRequests.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No tienes solicitudes de préstamo.
                </CardContent>
              </Card>
            )}
            {myRequests.map((req: any) => (
              <Card key={req.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        Solicitud #{req.id}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <Package className="h-4 w-4" />
                        <span>
                          {req.material_detail?.name || `Material ${req.material}`}
                        </span>
                      </div>
                    </div>
                    <Badge variant={getStatusBadgeVariant(req.status)}>
                      {req.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Cantidad</p>
                      <p className="font-medium">{req.quantity_requested}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Fecha deseada</p>
                      <p className="font-medium">
                        {formatDate(req.desired_pickup_date)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Retorno esperado</p>
                      <p className="font-medium">
                        {formatDate(req.desired_return_date)}
                      </p>
                    </div>
                    {req.purpose && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Propósito</p>
                        <p className="font-medium">{req.purpose}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* All Requests Tab (Inventarista only) */}
        {activeTab === 'all-requests' && isInventarista && (
          <div className="space-y-4">
            {loadingAllRequests && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Cargando solicitudes...
                </CardContent>
              </Card>
            )}
            {!loadingAllRequests && allRequests.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No hay solicitudes pendientes.
                </CardContent>
              </Card>
            )}
            {allRequests.map((req: any) => (
              <Card key={req.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        Solicitud #{req.id}
                      </CardTitle>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>
                            {req.requester_detail?.full_name ||
                              req.requester_detail?.email ||
                              'N/D'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          <span>
                            {req.material_detail?.name || `Material ${req.material}`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={getStatusBadgeVariant(req.status)}>
                      {req.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Cantidad</p>
                      <p className="font-medium">{req.quantity_requested}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Fecha deseada</p>
                      <p className="font-medium">
                        {formatDate(req.desired_pickup_date)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Retorno esperado</p>
                      <p className="font-medium">
                        {formatDate(req.desired_return_date)}
                      </p>
                    </div>
                    {req.purpose && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Propósito</p>
                        <p className="font-medium">{req.purpose}</p>
                      </div>
                    )}
                  </div>
                  {req.status === 'pending' && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => handleOpenApprovalModal('approve', req.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleOpenApprovalModal('reject', req.id)}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Rechazar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* My Loans Tab */}
        {activeTab === 'my-loans' && (
          <div className="space-y-4">
            {loadingMyLoans && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Cargando préstamos...
                </CardContent>
              </Card>
            )}
            {!loadingMyLoans && myLoans.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No tienes préstamos activos.
                </CardContent>
              </Card>
            )}
            {myLoans.map((loan: any) => (
              <Card key={loan.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">Préstamo #{loan.id}</CardTitle>
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <Package className="h-4 w-4" />
                        <span>
                          {loan.material_detail?.name || `Material ${loan.material}`}
                        </span>
                      </div>
                    </div>
                    <Badge variant={getStatusBadgeVariant(loan.status)}>
                      {loan.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Cantidad</p>
                      <p className="font-medium">{loan.quantity_loaned}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Fecha de préstamo</p>
                      <p className="font-medium">{formatDate(loan.issued_at)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Retorno esperado</p>
                      <p className="font-medium">
                        {formatDate(loan.expected_return_date)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Días restantes</p>
                      <p
                        className={`font-medium ${
                          loan.is_overdue ? 'text-destructive' : ''
                        }`}
                      >
                        {loan.days_until_return} días
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* All Loans Tab (Inventarista only) */}
        {activeTab === 'all-loans' && isInventarista && (
          <div className="space-y-4">
            {loadingAllLoans && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Cargando préstamos...
                </CardContent>
              </Card>
            )}
            {!loadingAllLoans && allLoans.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No hay préstamos registrados.
                </CardContent>
              </Card>
            )}
            {allLoans.map((loan: any) => (
              <Card key={loan.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">Préstamo #{loan.id}</CardTitle>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>
                            {loan.borrower_detail?.full_name ||
                              loan.borrower_detail?.email ||
                              'N/D'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          <span>
                            {loan.material_detail?.name || `Material ${loan.material}`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={getStatusBadgeVariant(loan.status)}>
                      {loan.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Cantidad</p>
                      <p className="font-medium">{loan.quantity_loaned}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Fecha de préstamo</p>
                      <p className="font-medium">{formatDate(loan.issued_at)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Retorno esperado</p>
                      <p className="font-medium">
                        {formatDate(loan.expected_return_date)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Días restantes</p>
                      <p
                        className={`font-medium ${
                          loan.is_overdue ? 'text-destructive' : ''
                        }`}
                      >
                        {loan.days_until_return} días
                      </p>
                    </div>
                  </div>
                  {!loan.is_consumable_loan &&
                    (loan.status === 'active' || loan.status === 'overdue') && (
                      <div className="pt-2">
                        <Button
                          size="sm"
                          onClick={() => handleOpenReturnModal(loan.id)}
                        >
                          Registrar devolución
                        </Button>
                      </div>
                    )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Extensions Tab */}
        {activeTab === 'extensions' && (
          <div className="space-y-4">
            {loadingExtensions && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Cargando extensiones...
                </CardContent>
              </Card>
            )}
            {!loadingExtensions && extensions.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No hay solicitudes de extensión.
                </CardContent>
              </Card>
            )}
            {extensions.map((ext: any) => (
              <Card key={ext.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">Extensión #{ext.id}</CardTitle>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>
                            {ext.requested_by_detail?.full_name ||
                              ext.requested_by_detail?.email ||
                              'N/D'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Préstamo #{ext.loan}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={getStatusBadgeVariant(ext.status)}>
                      {ext.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Nueva fecha</p>
                      <p className="font-medium">
                        {formatDate(ext.new_return_date)}
                      </p>
                    </div>
                    {ext.reason && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Motivo</p>
                        <p className="font-medium">{ext.reason}</p>
                      </div>
                    )}
                  </div>
                  {ext.status === 'pending' && isInventarista && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => handleApproveExtension(ext.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRejectExtension(ext.id, 'Rechazado')}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Rechazar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Approval Modal */}
        {approvalModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>
                  {approvalModal.type === 'approve' ? 'Aprobar' : 'Rechazar'}{' '}
                  Solicitud
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {approvalModal.type === 'approve' ? 'Notas (opcional)' : 'Motivo del rechazo'}
                  </label>
                  <textarea
                    value={approvalModal.notes}
                    onChange={(e) =>
                      setApprovalModal((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder={
                      approvalModal.type === 'approve'
                        ? 'Notas adicionales...'
                        : 'Explica el motivo del rechazo...'
                    }
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSubmitApproval}
                    disabled={
                      approvalModal.type === 'reject' && !approvalModal.notes
                    }
                    className="flex-1"
                  >
                    Confirmar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCloseApprovalModal}
                    className="flex-1"
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
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Registrar Devolución</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Condición
                  </label>
                  <select
                    value={returnModal.condition}
                    onChange={(e) =>
                      setReturnModal((prev) => ({
                        ...prev,
                        condition: e.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="excellent">Excelente</option>
                    <option value="good">Bueno</option>
                    <option value="fair">Regular</option>
                    <option value="poor">Malo</option>
                    <option value="damaged">Dañado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Notas (opcional)
                  </label>
                  <textarea
                    value={returnModal.notes}
                    onChange={(e) =>
                      setReturnModal((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Daños, observaciones..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSubmitReturn} className="flex-1">
                    Guardar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCloseReturnModal}
                    className="flex-1"
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
