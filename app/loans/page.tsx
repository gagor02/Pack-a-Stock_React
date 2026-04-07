'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { useAuthStore } from '@/store/authStore'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui'
import { Badge } from '@/components/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Input } from '@/components/ui'
import {
  useLoanRequests,
  useMyRequests,
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
  ShieldBan,
  AlertTriangle,
  Plus,
  Clock,
  RotateCcw,
  Inbox,
  QrCode,
  ScanLine,
  Search,
  History,
} from 'lucide-react'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { useQuery } from '@tanstack/react-query'
import BiometricVerificationModal from '@/components/biometrics/BiometricVerificationModal'
import { requiresBiometricVerification } from '@/lib/biometrics'

type TabKey = 'activos' | 'devoluciones' | 'historial'

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

interface QRScanModalState {
  isOpen: boolean
  token: string
  isSearching: boolean
  result: any | null
  resultType: 'request' | 'loan' | null
  error: string | null
  scanning: boolean
}

interface QRShowModalState {
  isOpen: boolean
  qrToken: string
  title: string
  subtitle: string
}

interface RequestDetailModal {
  isOpen: boolean
  request: any | null
}

export default function LoansPage() {
  const { user } = useAuthStore()
  const isInventarista = user?.user_type === 'inventarista'

  const [activeTab, setActiveTab] = useState<TabKey>('activos')
  const [searchTerm, setSearchTerm] = useState('')
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
  const [qrModal, setQrModal] = useState<QRScanModalState>({
    isOpen: false,
    token: '',
    isSearching: false,
    result: null,
    resultType: null,
    error: null,
    scanning: false,
  })
  const [qrShowModal, setQrShowModal] = useState<QRShowModalState>({
    isOpen: false,
    qrToken: '',
    title: '',
    subtitle: '',
  })
  const [requestDetailModal, setRequestDetailModal] = useState<RequestDetailModal>({
    isOpen: false,
    request: null,
  })
  const [biometricModal, setBiometricModal] = useState<{ open: boolean; pendingRequest: any | null }>({
    open: false,
    pendingRequest: null,
  })
  const scannerRef = useRef<any>(null)
  const scannerContainerRef = useRef<HTMLDivElement>(null)

  // Queries
  const { data: biometricStatus } = useQuery<{ enrolled: boolean }>({
    queryKey: ['biometric-status'],
    queryFn: async () => { const { data } = await api.get('/auth/biometrics/status/'); return data },
    staleTime: 60_000,
    enabled: isInventarista,
  })
  const { data: myRequestsData } = useMyRequests()
  const { data: allRequestsData } = useLoanRequests()
  const { data: myLoansData, isLoading: loadingMyLoans } = useMyLoans()
  const { data: allLoansData, isLoading: loadingAllLoans } = useLoans()
  const { data: extensionsData } = useLoanExtensions()

  // Mutations
  const returnMutation = useReturnLoan()
  const approveExtensionMutation = useApproveExtension()
  const rejectExtensionMutation = useRejectExtension()

  // Extract data arrays
  const myRequests = Array.isArray(myRequestsData) ? myRequestsData : myRequestsData?.results ?? []
  const allRequests = Array.isArray(allRequestsData) ? allRequestsData : allRequestsData?.results ?? []
  const myLoans = Array.isArray(myLoansData) ? myLoansData : myLoansData?.results ?? []
  const allLoans = Array.isArray(allLoansData) ? allLoansData : allLoansData?.results ?? []
  const extensions = Array.isArray(extensionsData) ? extensionsData : extensionsData?.results ?? []

  // Data
  const loans = isInventarista ? allLoans : myLoans
  const requests = isInventarista ? allRequests : myRequests

  // Tab 1: Activos — préstamos en circulación (activos + vencidos)
  const activeLoans = loans.filter((l: any) => l.status === 'active' || l.status === 'overdue')

  // Tab 2: Devoluciones — mismos activos pero enfocado en acción de devolver
  // (usa activeLoans)

  // Tab 3: Historial — solicitudes procesadas + préstamos devueltos/completados
  const historyRequests = requests.filter((r: any) => r.status !== 'pending')
  const historyLoans = loans.filter((l: any) => l.status === 'returned' || l.status === 'completed' || l.status === 'lost')

  // Stats
  const activeCount = activeLoans.filter((l: any) => l.status === 'active').length
  const overdueCount = activeLoans.filter((l: any) => l.status === 'overdue').length
  const returnedCount = historyLoans.length

  // Filtro de búsqueda
  const filterBySearch = (items: any[]) => {
    if (!searchTerm) return items
    const term = searchTerm.toLowerCase()
    return items.filter((item: any) => {
      const materialName = item.material_detail?.name || item.items?.map((i: any) => i.material_detail?.name).join(', ') || ''
      const userName = item.borrower_detail?.full_name || item.requester_detail?.full_name || ''
      return materialName.toLowerCase().includes(term) || userName.toLowerCase().includes(term)
    })
  }

  // Handlers
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
      { onSuccess: () => handleCloseReturnModal() }
    )
  }

  const handleOpenPenaltyModal = (loan: any) => {
    const userName = loan.borrower_detail?.full_name || loan.borrower_detail?.email || 'Usuario desconocido'
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
      toast.error(error.response?.data?.message || error.response?.data?.detail || 'Error al penalizar usuario')
      setPenaltyModal((prev) => ({ ...prev, isSubmitting: false }))
    }
  }

  const handleDeliverFromQR = (request: any) => {
    const items = request.items || []
    if (items.length === 0) { toast.error('Esta solicitud no tiene materiales'); return }

    if (requiresBiometricVerification(items)) {
      if (!biometricStatus?.enrolled) {
        toast.error('Debes registrar tu rostro en Configuración → Verificación Biométrica')
        return
      }
      setBiometricModal({ open: true, pendingRequest: request })
      return
    }

    executeDeliverFromQR(request)
  }

  // QR Scanner
  const searchByToken = async (token: string) => {
    if (!token.trim()) return

    setQrModal((prev) => ({ ...prev, isSearching: true, error: null, result: null, resultType: null }))

    try {
      const reqRes = await api.get(`/loans/loan-requests/by-qr/${token.trim()}/`)
      setQrModal((prev) => ({
        ...prev,
        isSearching: false,
        result: reqRes.data?.data || reqRes.data,
        resultType: 'request',
        scanning: false,
      }))
      stopScanner()
      return
    } catch {
      // No es solicitud, buscar como préstamo
    }

    try {
      const loanRes = await api.get(`/loans/loans/by-qr/${token.trim()}/`)
      setQrModal((prev) => ({
        ...prev,
        isSearching: false,
        result: loanRes.data?.data || loanRes.data,
        resultType: 'loan',
        scanning: false,
      }))
      stopScanner()
    } catch {
      setQrModal((prev) => ({
        ...prev,
        isSearching: false,
        error: 'No se encontro ningun pedido o prestamo con este QR',
      }))
    }
  }

  const handleQRSearch = () => searchByToken(qrModal.token)

  const startScanner = async () => {
    setQrModal((prev) => ({ ...prev, scanning: true, error: null }))
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      await new Promise((r) => setTimeout(r, 300))
      if (!scannerContainerRef.current) return
      const scanner = new Html5Qrcode('qr-scanner-container')
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => {
          searchByToken(decodedText)
        },
        () => {}
      )
    } catch (err: any) {
      setQrModal((prev) => ({
        ...prev,
        scanning: false,
        error: 'No se pudo acceder a la camara. Usa el campo manual.',
      }))
    }
  }

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {})
      scannerRef.current = null
    }
    setQrModal((prev) => ({ ...prev, scanning: false }))
  }

  const handleCloseQRModal = () => {
    stopScanner()
    setQrModal({ isOpen: false, token: '', isSearching: false, result: null, resultType: null, error: null, scanning: false })
  }

  // Crear préstamos a partir de una solicitud aprobada (entrega de materiales)
  const executeDeliverFromQR = async (request: any) => {
    const items = request.items || []
    setQrModal((prev) => ({ ...prev, isSearching: true }))

    try {
      const loanPromises = items.map((item: any) =>
        api.post('/loans/loans/', {
          borrower: request.requester,
          material: item.material,
          quantity_loaned: item.quantity_requested,
          expected_return_date: request.desired_return_date ? request.desired_return_date.split('T')[0] : null,
          loan_request: request.id,
        })
      )
      await Promise.all(loanPromises)
      // Marcar la solicitud como completada para evitar entregas duplicadas
      await api.patch(`/loans/loan-requests/${request.id}/`, { status: 'completed' })
      toast.success(`${items.length} prestamo(s) creado(s) exitosamente`)
      handleCloseQRModal()
    } catch (error: any) {
      const msg = error.response?.data?.quantity_loaned || error.response?.data?.material || error.response?.data?.detail || 'Error al crear prestamos'
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg))
      setQrModal((prev) => ({ ...prev, isSearching: false }))
    }
  }

  // Helper functions
  const getStatusBadgeVariant = (status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
    switch (status) {
      case 'approved': case 'active': return 'success'
      case 'pending': return 'warning'
      case 'rejected': case 'overdue': case 'lost': return 'danger'
      case 'returned': case 'completed': return 'info'
      default: return 'default'
    }
  }

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      approved: 'Aprobado',
      rejected: 'Rechazado',
      cancelled: 'Cancelado',
      completed: 'Completado',
      active: 'Activo',
      overdue: 'Vencido',
      returned: 'Devuelto',
      lost: 'Perdido',
    }
    return labels[status] || status
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'approved': case 'active': return 'border-l-green-500'
      case 'pending': return 'border-l-yellow-500'
      case 'rejected': case 'lost': return 'border-l-red-500'
      case 'overdue': return 'border-l-red-500'
      case 'returned': case 'completed': return 'border-l-blue-500'
      default: return 'border-l-primary'
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

  // Loading spinner
  const Spinner = () => (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-primary mb-4"></div>
      <p className="text-base text-muted-foreground">Cargando...</p>
    </div>
  )

  // Empty state
  const EmptyState = ({ message, icon: Icon = Package }: { message: string; icon?: any }) => (
    <Card className="border-dashed border-2">
      <CardContent className="p-16 text-center">
        <div className="p-4 bg-secondary/30 rounded-2xl w-fit mx-auto mb-6">
          <Icon className="h-14 w-14 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-3">Sin resultados</h3>
        <p className="text-base text-muted-foreground max-w-sm mx-auto">{message}</p>
      </CardContent>
    </Card>
  )

  const isLoading = loadingMyLoans || loadingAllLoans

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
                Gestiona prestamos activos, devoluciones e historial
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isInventarista && (
              <Button
                variant="secondary"
                size="lg"
                className="text-base px-5"
                onClick={() => setQrModal((prev) => ({ ...prev, isOpen: true }))}
              >
                <QrCode className="h-5 w-5 mr-2" />
                Escanear QR
              </Button>
            )}
            {isInventarista && (
              <Link href="/loans/new">
                <Button size="lg" className="text-base px-6">
                  <Plus className="h-5 w-5 mr-2" />
                  Nuevo Prestamo
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5 rounded-xl border-2 border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-green-500/10">
                <Package className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{activeCount}</p>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Activos</p>
              </div>
            </div>
          </Card>
          <Card className="p-5 rounded-xl border-2 border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/10">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{overdueCount}</p>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Vencidos</p>
              </div>
            </div>
          </Card>
          <Card className="p-5 rounded-xl border-2 border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10">
                <RotateCcw className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{returnedCount}</p>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Devueltos</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1.5 bg-secondary/30 rounded-xl">
          {[
            { key: 'activos' as TabKey, label: 'Activos', icon: Package, count: activeLoans.length },
            { key: 'devoluciones' as TabKey, label: 'Devoluciones', icon: RotateCcw, count: activeLoans.length },
            { key: 'historial' as TabKey, label: 'Historial', icon: History, count: historyLoans.length + historyRequests.length },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl text-base font-medium transition-all ${
                  isActive
                    ? 'bg-card text-foreground shadow-md border border-border/50'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
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

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por material o usuario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border-2 border-border bg-card px-5 py-3.5 pl-12 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
          />
        </div>

        {/* ====== TAB ACTIVOS ====== */}
        {activeTab === 'activos' && (
          <>
            {isLoading ? <Spinner /> : (
              <div className="space-y-5">
                {/* Extensiones pendientes */}
                {extensions.filter((e: any) => e.status === 'pending').length > 0 && isInventarista && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Clock className="h-5 w-5 text-blue-500" />
                      </div>
                      <h2 className="text-lg font-bold text-foreground">Extensiones pendientes</h2>
                      <Badge variant="warning" className="text-sm px-3 py-1">
                        {extensions.filter((e: any) => e.status === 'pending').length}
                      </Badge>
                    </div>
                    <div className="space-y-4">
                      {extensions.filter((e: any) => e.status === 'pending').map((ext: any) => (
                        <Card key={`ext-${ext.id}`} className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all duration-300">
                          <CardContent className="p-0">
                            <div className="flex flex-col gap-4 p-5">
                              <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-blue-500/10">
                                  <Clock className="h-5 w-5 text-blue-500" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h3 className="text-base font-bold text-foreground">
                                    {ext.requested_by_detail?.full_name || 'N/D'}
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    Prestamo #{ext.loan} · Nueva fecha: {formatDate(ext.new_return_date)}
                                  </p>
                                </div>
                                <Badge variant="warning" className="text-sm px-3 py-1">Pendiente</Badge>
                              </div>
                              {ext.reason && (
                                <p className="text-sm text-muted-foreground bg-secondary/20 rounded-xl p-3">{ext.reason}</p>
                              )}
                              <div className="grid grid-cols-2 gap-3 w-full pt-2 border-t border-border/30">
                                <Button
                                  onClick={() => approveExtensionMutation.mutate({ id: ext.id })}
                                  variant="primary"
                                  size="lg"
                                  className="w-full text-base py-3"
                                >
                                  <CheckCircle className="h-5 w-5 mr-2" />
                                  Aprobar
                                </Button>
                                <Button
                                  onClick={() => rejectExtensionMutation.mutate({ id: ext.id, reason: 'Rechazado' })}
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

                {/* Vencidos primero */}
                {filterBySearch(activeLoans).filter((l: any) => l.status === 'overdue').length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-500/10 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      </div>
                      <h2 className="text-lg font-bold text-foreground">Vencidos</h2>
                      <Badge variant="danger" className="text-sm px-3 py-1">
                        {activeLoans.filter((l: any) => l.status === 'overdue').length}
                      </Badge>
                    </div>
                    {filterBySearch(activeLoans).filter((l: any) => l.status === 'overdue').map((loan: any) => (
                      <LoanCard
                        key={`loan-${loan.id}`}
                        loan={loan}
                        formatDate={formatDate}
                        getStatusBadgeVariant={getStatusBadgeVariant}
                        getStatusLabel={getStatusLabel}
                      />
                    ))}
                  </div>
                )}

                {/* Activos */}
                {filterBySearch(activeLoans).filter((l: any) => l.status === 'active').length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <Package className="h-5 w-5 text-green-500" />
                      </div>
                      <h2 className="text-lg font-bold text-foreground">En circulacion</h2>
                    </div>
                    {filterBySearch(activeLoans).filter((l: any) => l.status === 'active').map((loan: any) => (
                      <LoanCard
                        key={`loan-${loan.id}`}
                        loan={loan}
                        formatDate={formatDate}
                        getStatusBadgeVariant={getStatusBadgeVariant}
                        getStatusLabel={getStatusLabel}
                      />
                    ))}
                  </div>
                )}

                {filterBySearch(activeLoans).length === 0 && extensions.filter((e: any) => e.status === 'pending').length === 0 && (
                  <EmptyState message="No hay prestamos activos en este momento" icon={Package} />
                )}
              </div>
            )}
          </>
        )}

        {/* ====== TAB DEVOLUCIONES ====== */}
        {activeTab === 'devoluciones' && (
          <>
            {isLoading ? <Spinner /> : filterBySearch(activeLoans).length === 0 ? (
              <EmptyState message="No hay prestamos pendientes de devolucion" icon={RotateCcw} />
            ) : (
              <div className="space-y-5">
                {/* Vencidos primero */}
                {filterBySearch(activeLoans).filter((l: any) => l.status === 'overdue').length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-500/10 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      </div>
                      <h2 className="text-lg font-bold text-foreground">Vencidos</h2>
                      <Badge variant="danger" className="text-sm px-3 py-1">
                        {activeLoans.filter((l: any) => l.status === 'overdue').length}
                      </Badge>
                    </div>
                    {filterBySearch(activeLoans).filter((l: any) => l.status === 'overdue').map((loan: any) => (
                      <LoanReturnCard
                        key={`ret-${loan.id}`}
                        loan={loan}
                        isInventarista={isInventarista}
                        onReturn={() => handleOpenReturnModal(loan.id)}
                        onPenalize={() => handleOpenPenaltyModal(loan)}
                        formatDate={formatDate}
                      />
                    ))}
                  </div>
                )}

                {/* Activos */}
                {filterBySearch(activeLoans).filter((l: any) => l.status === 'active').length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <Package className="h-5 w-5 text-green-500" />
                      </div>
                      <h2 className="text-lg font-bold text-foreground">Activos</h2>
                    </div>
                    {filterBySearch(activeLoans).filter((l: any) => l.status === 'active').map((loan: any) => (
                      <LoanReturnCard
                        key={`ret-${loan.id}`}
                        loan={loan}
                        isInventarista={isInventarista}
                        onReturn={() => handleOpenReturnModal(loan.id)}
                        onPenalize={() => {}}
                        formatDate={formatDate}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ====== TAB HISTORIAL ====== */}
        {activeTab === 'historial' && (
          <>
            {isLoading ? <Spinner /> : (
              <div className="space-y-5">
                {filterBySearch([...historyRequests, ...historyLoans]).length === 0 ? (
                  <EmptyState message="No hay historial de prestamos aun" icon={History} />
                ) : (
                  <>
                    {/* Solicitudes procesadas */}
                    {filterBySearch(historyRequests).map((req: any) => {
                      const items = req.items || []
                      const itemNames = items.map((i: any) => i.material_detail?.name || `Material #${i.material}`).join(', ')
                      const totalQty = items.reduce((sum: number, i: any) => sum + (i.quantity_requested || 0), 0)
                      return (
                        <Card
                          key={`req-h-${req.id}`}
                          className={`border-l-4 ${getStatusColor(req.status)} hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer`}
                          onClick={() => setRequestDetailModal({ isOpen: true, request: req })}
                        >
                          <CardContent className="p-0">
                            <div className="flex flex-col gap-3 p-5">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-secondary/30">
                                  <Inbox className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h3 className="text-base font-bold text-foreground truncate">
                                    {itemNames || 'Sin materiales'}
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    {req.requester_detail?.full_name || 'N/D'} · x{totalQty}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {req.status === 'approved' && req.qr_token && (
                                    <button
                                      onClick={() => setQrShowModal({
                                        isOpen: true,
                                        qrToken: req.qr_token,
                                        title: 'QR del Pedido',
                                        subtitle: `Pedido #${req.id} - ${req.requester_detail?.full_name || 'N/D'}`,
                                      })}
                                      className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                                      title="Ver QR"
                                    >
                                      <QrCode className="h-4 w-4 text-primary" />
                                    </button>
                                  )}
                                  <Badge variant={getStatusBadgeVariant(req.status)} className="text-sm px-3 py-1">
                                    {getStatusLabel(req.status)}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">#{req.id}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {formatDate(req.desired_return_date)}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}

                    {/* Préstamos completados/devueltos */}
                    {filterBySearch(historyLoans).map((loan: any) => (
                      <Card key={`loan-h-${loan.id}`} className={`border-l-4 ${getStatusColor(loan.status)} hover:shadow-lg transition-all duration-300 overflow-hidden`}>
                        <CardContent className="p-0">
                          <div className="flex flex-col gap-3 p-5">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-xl bg-blue-500/10">
                                <RotateCcw className="h-5 w-5 text-blue-500" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="text-base font-bold text-foreground truncate">
                                  {loan.material_detail?.name || `Material #${loan.material}`}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {loan.borrower_detail?.full_name || 'N/D'} · x{loan.quantity_loaned}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Badge variant={getStatusBadgeVariant(loan.status)} className="text-sm px-3 py-1">
                                  {getStatusLabel(loan.status)}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                Devuelto: {formatDate(loan.actual_return_date || loan.updated_at)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                Prestado: {formatDate(loan.issued_at)}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* ====== MODALS ====== */}

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
                    Condicion del material
                  </label>
                  <select
                    value={returnModal.condition}
                    onChange={(e) => setReturnModal((prev) => ({ ...prev, condition: e.target.value }))}
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
                    onChange={(e) => setReturnModal((prev) => ({ ...prev, notes: e.target.value }))}
                    className="w-full min-h-[100px] rounded-xl border-2 border-border bg-card px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    placeholder="Observaciones..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={handleSubmitReturn} size="lg" className="w-full text-base py-3">
                    Confirmar Devolucion
                  </Button>
                  <Button variant="secondary" onClick={handleCloseReturnModal} size="lg" className="w-full text-base py-3">
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPenaltyModal((prev) => ({ ...prev, daysBlocked: parseInt(e.target.value) || 1 }))}
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
                    onChange={(e) => setPenaltyModal((prev) => ({ ...prev, reason: e.target.value }))}
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
                  <Button variant="secondary" onClick={handleClosePenaltyModal} size="lg" className="w-full text-base py-3">
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* QR Scan Modal */}
        {qrModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg border-2 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <QrCode className="w-5 h-5 text-primary" />
                  </div>
                  Escanear QR de Pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Scanner de camara */}
                {!qrModal.result && (
                  <div className="space-y-4">
                    {qrModal.scanning ? (
                      <div className="space-y-3">
                        <div
                          ref={scannerContainerRef}
                          id="qr-scanner-container"
                          className="w-full aspect-square max-h-[300px] rounded-xl overflow-hidden border-2 border-primary/30 bg-black"
                        />
                        <Button
                          variant="secondary"
                          onClick={stopScanner}
                          size="lg"
                          className="w-full text-base py-3"
                        >
                          Detener camara
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Button
                          onClick={startScanner}
                          variant="primary"
                          size="lg"
                          className="w-full text-base py-3"
                        >
                          <ScanLine className="h-5 w-5 mr-2" />
                          Abrir Camara
                        </Button>
                        <div className="relative flex items-center">
                          <div className="flex-1 border-t border-border/50" />
                          <span className="px-4 text-xs text-muted-foreground uppercase tracking-wider">o buscar manual</span>
                          <div className="flex-1 border-t border-border/50" />
                        </div>
                        <div className="flex gap-3">
                          <input
                            type="text"
                            value={qrModal.token}
                            onChange={(e) => setQrModal((prev) => ({ ...prev, token: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && handleQRSearch()}
                            className="flex-1 rounded-xl border-2 border-border bg-card px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                            placeholder="Pega el token aqui..."
                          />
                          <Button onClick={handleQRSearch} disabled={qrModal.isSearching || !qrModal.token.trim()} size="lg" className="px-6">
                            <Search className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {qrModal.isSearching && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                  </div>
                )}

                {qrModal.error && (
                  <div className="p-4 bg-destructive/10 border-2 border-destructive/20 rounded-xl">
                    <p className="text-base text-destructive font-medium">{qrModal.error}</p>
                  </div>
                )}

                {/* Resultado: Solicitud */}
                {qrModal.result && qrModal.resultType === 'request' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-500/10 border-2 border-green-500/20 rounded-xl">
                      <p className="text-sm font-bold text-green-400 uppercase tracking-wider mb-2">Solicitud encontrada</p>
                      <div className="space-y-2">
                        <p className="text-base text-foreground">
                          <strong>Solicitante:</strong> {qrModal.result.requester_detail?.full_name || 'N/D'}
                        </p>
                        <p className="text-base text-foreground">
                          <strong>Estado:</strong> {getStatusLabel(qrModal.result.status)}
                        </p>
                        <p className="text-base text-foreground">
                          <strong>Materiales:</strong>{' '}
                          {(qrModal.result.items || []).map((i: any) =>
                            `${i.material_detail?.name || 'N/D'} x${i.quantity_requested}`
                          ).join(', ')}
                        </p>
                        <p className="text-base text-foreground">
                          <strong>Devolucion:</strong> {formatDate(qrModal.result.desired_return_date)}
                        </p>
                      </div>
                    </div>
                    {qrModal.result.status === 'approved' && (
                      <div className="space-y-2">
                        {requiresBiometricVerification(qrModal.result.items || []) && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-xs">
                            <span>🔒</span>
                            <span>Verificación facial requerida — más de 3 materiales no consumibles</span>
                          </div>
                        )}
                        <Button
                          onClick={() => handleDeliverFromQR(qrModal.result)}
                          disabled={qrModal.isSearching}
                          variant="primary"
                          size="lg"
                          className="w-full text-base py-3"
                        >
                          <Package className="h-5 w-5 mr-2" />
                          {qrModal.isSearching ? 'Creando prestamos...' : 'Entregar Materiales'}
                        </Button>
                      </div>
                    )}
                    {(qrModal.result.status === 'completed' || qrModal.result.status === 'rejected') && (
                      <div className="p-3 bg-secondary/20 rounded-xl text-center">
                        <p className="text-sm text-muted-foreground">
                          Este pedido ya fue {qrModal.result.status === 'completed' ? 'completado' : 'rechazado'}
                        </p>
                      </div>
                    )}
                    <Button
                      variant="secondary"
                      onClick={() => setQrModal((prev) => ({ ...prev, result: null, resultType: null, error: null, token: '' }))}
                      size="lg"
                      className="w-full text-base py-3"
                    >
                      Escanear otro QR
                    </Button>
                  </div>
                )}

                {/* Resultado: Prestamo */}
                {qrModal.result && qrModal.resultType === 'loan' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-500/10 border-2 border-blue-500/20 rounded-xl">
                      <p className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-2">Prestamo encontrado</p>
                      <div className="space-y-2">
                        <p className="text-base text-foreground">
                          <strong>Usuario:</strong> {qrModal.result.borrower_detail?.full_name || 'N/D'}
                        </p>
                        <p className="text-base text-foreground">
                          <strong>Material:</strong> {qrModal.result.material_detail?.name || 'N/D'} x{qrModal.result.quantity_loaned}
                        </p>
                        <p className="text-base text-foreground">
                          <strong>Estado:</strong> {getStatusLabel(qrModal.result.status)}
                        </p>
                        <p className="text-base text-foreground">
                          <strong>Devolver:</strong> {formatDate(qrModal.result.expected_return_date)}
                        </p>
                      </div>
                    </div>
                    {(qrModal.result.status === 'active' || qrModal.result.status === 'overdue') && (
                      <Button
                        onClick={() => {
                          const loanId = qrModal.result.id
                          handleCloseQRModal()
                          handleOpenReturnModal(loanId)
                        }}
                        variant="primary"
                        size="lg"
                        className="w-full text-base py-3"
                      >
                        <RotateCcw className="h-5 w-5 mr-2" />
                        Registrar Devolucion
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      onClick={() => setQrModal((prev) => ({ ...prev, result: null, resultType: null, error: null, token: '' }))}
                      size="lg"
                      className="w-full text-base py-3"
                    >
                      Escanear otro QR
                    </Button>
                  </div>
                )}

                <div className="pt-2">
                  <Button variant="secondary" onClick={handleCloseQRModal} size="lg" className="w-full text-base py-3">
                    Cerrar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Request Detail Modal */}
        {requestDetailModal.isOpen && requestDetailModal.request && (() => {
          const req = requestDetailModal.request
          const items = req.items || []
          const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
          const statusColors: Record<string, string> = {
            approved: 'text-green-400 bg-green-500/10 border-green-500/20',
            rejected: 'text-red-400 bg-red-500/10 border-red-500/20',
            completed: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
            cancelled: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
            pending: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
          }
          const sc = statusColors[req.status] || 'text-muted-foreground bg-secondary/20 border-border'
          return (
            <div
              className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
              onClick={() => setRequestDetailModal({ isOpen: false, request: null })}
            >
              <Card
                className="w-full max-w-lg border-2 shadow-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Inbox className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-base font-bold">Solicitud #{req.id}</p>
                        <p className="text-xs text-muted-foreground font-normal">{req.requester_detail?.full_name || 'N/D'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${sc}`}>
                        {getStatusLabel(req.status)}
                      </span>
                      <button
                        onClick={() => setRequestDetailModal({ isOpen: false, request: null })}
                        className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-secondary/20 rounded-xl">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Solicitada</p>
                      <p className="text-sm font-medium text-foreground">{fmt(req.requested_date || req.created_at)}</p>
                    </div>
                    <div className="p-3 bg-secondary/20 rounded-xl">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Retiro est.</p>
                      <p className="text-sm font-medium text-foreground">{fmt(req.desired_pickup_date)}</p>
                    </div>
                    {req.desired_return_date && (
                      <div className="p-3 bg-secondary/20 rounded-xl col-span-2">
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Devolución est.</p>
                        <p className="text-sm font-medium text-foreground">{fmt(req.desired_return_date)}</p>
                      </div>
                    )}
                  </div>

                  {req.purpose && (
                    <div className="p-3 bg-secondary/20 rounded-xl">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Propósito</p>
                      <p className="text-sm text-foreground">{req.purpose}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Materiales solicitados</p>
                    <div className="space-y-2">
                      {items.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                          <div className="p-1.5 bg-primary/10 rounded-lg flex-shrink-0">
                            <Package className="h-4 w-4 text-primary" />
                          </div>
                          <span className="text-sm text-foreground flex-1 truncate">
                            {item.material_detail?.name || `Material #${item.material}`}
                          </span>
                          <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg">
                            ×{item.quantity_requested || item.quantity || 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {req.review_notes && (
                    <div className={`p-4 rounded-xl border-2 ${req.status === 'rejected' ? 'bg-red-500/10 border-red-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
                      <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${req.status === 'rejected' ? 'text-red-400' : 'text-blue-400'}`}>
                        Notas del administrador
                      </p>
                      <p className="text-sm text-foreground">{req.review_notes}</p>
                    </div>
                  )}

                  {req.status === 'approved' && req.qr_token && (
                    <div className="flex flex-col items-center gap-3 p-4 bg-secondary/10 rounded-xl border-2 border-border">
                      <p className="text-xs font-bold text-green-400 uppercase tracking-wider">Código QR para recoger</p>
                      <div className="p-3 bg-white rounded-xl shadow-lg">
                        <QRCodeSVG value={req.qr_token} size={160} level="H" includeMargin />
                      </div>
                      <p className="text-xs text-muted-foreground text-center">Presenta este código al recoger los materiales</p>
                    </div>
                  )}

                  <Button
                    variant="secondary"
                    onClick={() => setRequestDetailModal({ isOpen: false, request: null })}
                    size="lg"
                    className="w-full text-base py-3"
                  >
                    Cerrar
                  </Button>
                </CardContent>
              </Card>
            </div>
          )
        })()}

        {/* QR Show Modal */}
        {qrShowModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-sm border-2 shadow-2xl">
              <CardHeader className="text-center">
                <CardTitle className="flex flex-col items-center gap-3 text-xl">
                  <div className="p-3 bg-green-500/10 rounded-xl">
                    <CheckCircle className="w-7 h-7 text-green-500" />
                  </div>
                  {qrShowModal.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 bg-white rounded-2xl shadow-lg">
                    <QRCodeSVG
                      value={qrShowModal.qrToken}
                      size={200}
                      level="H"
                      includeMargin
                    />
                  </div>
                  <p className="text-sm text-muted-foreground text-center max-w-xs">
                    {qrShowModal.subtitle}
                  </p>
                  <div className="w-full p-3 bg-secondary/20 rounded-xl">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Token</p>
                    <p className="text-xs text-foreground font-mono break-all">{qrShowModal.qrToken}</p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => setQrShowModal({ isOpen: false, qrToken: '', title: '', subtitle: '' })}
                  size="lg"
                  className="w-full text-base py-3"
                >
                  Cerrar
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Biometric Verification Modal — triggered before material delivery */}
      {biometricModal.pendingRequest && (
        <BiometricVerificationModal
          isOpen={biometricModal.open}
          nonConsumableCount={
            (biometricModal.pendingRequest.items || []).filter(
              (i: any) => i.material_detail?.is_consumable === false
            ).length
          }
          onVerified={() => {
            const req = biometricModal.pendingRequest
            setBiometricModal({ open: false, pendingRequest: null })
            executeDeliverFromQR(req)
          }}
          onClose={() => setBiometricModal({ open: false, pendingRequest: null })}
        />
      )}
    </DashboardLayout>
  )
}

// ---- Card compacta para tab Activos ----
function LoanCard({
  loan,
  formatDate,
  getStatusBadgeVariant,
  getStatusLabel,
}: {
  loan: any
  formatDate: (d?: string) => string
  getStatusBadgeVariant: (s: string) => any
  getStatusLabel: (s: string) => string
}) {
  const isOverdue = loan.status === 'overdue'

  return (
    <Card className={`border-l-4 ${isOverdue ? 'border-l-red-500' : 'border-l-green-500'} hover:shadow-lg transition-all duration-300 overflow-hidden`}>
      <CardContent className="p-0">
        <div className="flex flex-col gap-3 p-5">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isOverdue ? 'bg-destructive/10' : 'bg-green-500/10'}`}>
              {isOverdue ? (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              ) : (
                <Package className="h-5 w-5 text-green-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-foreground truncate">
                {loan.material_detail?.name || `Material #${loan.material}`}
              </h3>
              <p className="text-sm text-muted-foreground">
                {loan.borrower_detail?.full_name || 'N/D'} · x{loan.quantity_loaned}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant={getStatusBadgeVariant(loan.status)} className="text-sm px-3 py-1">
                {getStatusLabel(loan.status)}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Devolver: {formatDate(loan.expected_return_date)}
            </span>
            {loan.days_until_return !== undefined && (
              <span className={`flex items-center gap-1 ${isOverdue ? 'text-destructive font-medium' : ''}`}>
                <Clock className="h-3.5 w-3.5" />
                {loan.days_until_return} dias
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---- Card con acciones para tab Devoluciones ----
function LoanReturnCard({
  loan,
  isInventarista,
  onReturn,
  onPenalize,
  formatDate,
}: {
  loan: any
  isInventarista: boolean
  onReturn: () => void
  onPenalize: () => void
  formatDate: (d?: string) => string
}) {
  const isOverdue = loan.status === 'overdue'

  return (
    <Card className={`border-l-4 ${isOverdue ? 'border-l-red-500 border-2 border-destructive/30' : 'border-l-green-500'} hover:shadow-xl transition-all duration-300 overflow-hidden`}>
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 p-5">
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2.5 rounded-xl ${isOverdue ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                {isOverdue ? (
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                ) : (
                  <Package className="h-6 w-6 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-foreground">
                  {loan.material_detail?.name || `Material #${loan.material}`}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {loan.borrower_detail?.full_name || loan.borrower_detail?.email || 'N/D'}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant={isOverdue ? 'danger' : 'success'} className="text-sm px-3 py-1">
                  {isOverdue ? 'Vencido' : 'Activo'}
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
                <div className={`p-2 rounded-lg ${isOverdue ? 'bg-destructive/10' : 'bg-green-500/10'}`}>
                  <Clock className={`h-4 w-4 ${isOverdue ? 'text-destructive' : 'text-green-400'}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Tiempo</p>
                  <p className={`text-base font-medium ${isOverdue ? 'text-destructive' : 'text-foreground'}`}>
                    {loan.days_until_return} dias
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          {isInventarista && !loan.is_consumable_loan && (
            <div className={`grid ${isOverdue ? 'grid-cols-2' : 'grid-cols-1'} gap-3 w-full pt-2 border-t border-border/30 mt-2`}>
              <Button onClick={onReturn} variant="primary" size="lg" className="w-full text-base py-3">
                <RotateCcw className="h-5 w-5 mr-2" />
                Registrar Devolucion
              </Button>
              {isOverdue && (
                <Button onClick={onPenalize} variant="destructive" size="lg" className="w-full text-base py-3">
                  <ShieldBan className="h-5 w-5 mr-2" />
                  Penalizar
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
