'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface LoanRequestItem {
  id: number
  material: number
  quantity_requested: number
  material_detail?: {
    id: number
    name: string
    code?: string
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
}

interface Loan {
  id: number
  borrower: number
  borrower_detail?: {
    full_name?: string
    email?: string
  }
  material: number
  material_detail?: {
    name?: string
  }
  quantity_loaned: number
  status: string
  expected_return_date?: string
  is_overdue?: boolean
  is_consumable_loan?: boolean
}

interface LoanExtension {
  id: number
  loan: number
  requested_by_detail?: {
    full_name?: string
    email?: string
  }
  new_return_date?: string
  reason?: string
  status: string
}

type TabKey = 'requests' | 'loans' | 'extensions'

export default function LoansPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabKey>('requests')
  const [returnLoanId, setReturnLoanId] = useState<number | null>(null)
  const [returnCondition, setReturnCondition] = useState('good')
  const [returnNotes, setReturnNotes] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
    }
  }, [router])

  const { data: loanRequestsResponse = [], isLoading: loadingRequests } = useQuery({
    queryKey: ['loan-requests'],
    queryFn: async () => {
      const response = await api.get('/loans/loan-requests/')
      return response.data
    },
  })

  const loanRequests = Array.isArray(loanRequestsResponse)
    ? loanRequestsResponse
    : loanRequestsResponse?.results ?? []

  const { data: loansResponse = [], isLoading: loadingLoans } = useQuery({
    queryKey: ['loans'],
    queryFn: async () => {
      const response = await api.get('/loans/loans/')
      return response.data
    },
  })

  const loans = Array.isArray(loansResponse)
    ? loansResponse
    : loansResponse?.results ?? []

  const { data: extensionsResponse = [], isLoading: loadingExtensions } = useQuery({
    queryKey: ['loan-extensions'],
    queryFn: async () => {
      const response = await api.get('/loans/loan-extensions/')
      return response.data
    },
  })

  const extensions = Array.isArray(extensionsResponse)
    ? extensionsResponse
    : extensionsResponse?.results ?? []

  const approveRequestMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      await api.post(`/loans/loan-requests/${id}/approve/`, { notes })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-requests'] })
      toast.success('Solicitud aprobada')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al aprobar solicitud')
    },
  })

  const rejectRequestMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      await api.post(`/loans/loan-requests/${id}/reject/`, { notes })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-requests'] })
      toast.success('Solicitud rechazada')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al rechazar solicitud')
    },
  })

  const createLoansMutation = useMutation({
    mutationFn: async (request: LoanRequest) => {
      for (const item of request.items || []) {
        await api.post('/loans/loans/', {
          loan_request: request.id,
          borrower: request.requester,
          material: item.material,
          quantity_loaned: item.quantity_requested,
          expected_return_date: request.desired_return_date || null,
          condition_on_pickup: 'good',
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      toast.success('Préstamos creados')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al crear préstamos')
    },
  })

  const returnLoanMutation = useMutation({
    mutationFn: async ({ id, condition, notes }: { id: number; condition: string; notes: string }) => {
      await api.post(`/loans/loans/${id}/return_loan/`, {
        condition_on_return: condition,
        damage_notes: notes,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      setReturnLoanId(null)
      setReturnCondition('good')
      setReturnNotes('')
      toast.success('Préstamo devuelto')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al registrar devolución')
    },
  })

  const approveExtensionMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      await api.post(`/loans/loan-extensions/${id}/approve/`, { notes })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-extensions'] })
      toast.success('Extensión aprobada')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al aprobar extensión')
    },
  })

  const rejectExtensionMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      await api.post(`/loans/loan-extensions/${id}/reject/`, { notes })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-extensions'] })
      toast.success('Extensión rechazada')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Error al rechazar extensión')
    },
  })

  const handleApprove = (id: number) => {
    const notes = prompt('Notas (opcional):') || ''
    approveRequestMutation.mutate({ id, notes })
  }

  const handleReject = (id: number) => {
    const notes = prompt('Motivo del rechazo (opcional):') || ''
    rejectRequestMutation.mutate({ id, notes })
  }

  const handleCreateLoans = (request: LoanRequest) => {
    if (!request.items || request.items.length === 0) {
      toast.error('La solicitud no tiene items')
      return
    }
    createLoansMutation.mutate(request)
  }

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!returnLoanId) return
    returnLoanMutation.mutate({
      id: returnLoanId,
      condition: returnCondition,
      notes: returnNotes,
    })
  }

  const handleApproveExtension = (id: number) => {
    const notes = prompt('Notas (opcional):') || ''
    approveExtensionMutation.mutate({ id, notes })
  }

  const handleRejectExtension = (id: number) => {
    const notes = prompt('Motivo del rechazo (opcional):') || ''
    rejectExtensionMutation.mutate({ id, notes })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
              ← Volver
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Préstamos</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-2 mb-6">
          {(['requests', 'loans', 'extensions'] as TabKey[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                activeTab === tab ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'
              }`}
            >
              {tab === 'requests' && 'Solicitudes'}
              {tab === 'loans' && 'Préstamos activos'}
              {tab === 'extensions' && 'Extensiones'}
            </button>
          ))}
        </div>

        {activeTab === 'requests' && (
          <div className="space-y-4">
            {loadingRequests && <div>Cargando solicitudes...</div>}
            {!loadingRequests && loanRequests.length === 0 && (
              <div className="text-gray-600">No hay solicitudes.</div>
            )}
            {loanRequests.map((req: LoanRequest) => (
              <div key={req.id} className="bg-white rounded-lg shadow p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-gray-900">Solicitud #{req.id}</div>
                    <div className="text-sm text-gray-600">
                      Solicitante: {req.requester_detail?.full_name || req.requester_detail?.email || 'N/D'}
                    </div>
                  </div>
                  <span className="text-xs uppercase font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-700">
                    {req.status}
                  </span>
                </div>
                <div className="mt-3 text-sm text-gray-600">
                  <div>Entrega deseada: {req.desired_pickup_date || 'N/D'}</div>
                  <div>Retorno deseado: {req.desired_return_date || 'N/D'}</div>
                  {req.purpose && <div>Motivo: {req.purpose}</div>}
                </div>

                <div className="mt-3">
                  <div className="text-sm font-medium text-gray-700">Items:</div>
                  <ul className="mt-1 text-sm text-gray-600 list-disc list-inside">
                    {req.items?.map((item) => (
                      <li key={item.id}>
                        {item.material_detail?.name || `Material ${item.material}`} x{item.quantity_requested}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleApprove(req.id)}
                    className="px-3 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700"
                  >
                    Aprobar
                  </button>
                  <button
                    onClick={() => handleReject(req.id)}
                    className="px-3 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700"
                  >
                    Rechazar
                  </button>
                  <button
                    onClick={() => handleCreateLoans(req)}
                    className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Crear préstamos
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'loans' && (
          <div className="space-y-4">
            {loadingLoans && <div>Cargando préstamos...</div>}
            {!loadingLoans && loans.length === 0 && (
              <div className="text-gray-600">No hay préstamos activos.</div>
            )}

            {returnLoanId && (
              <form onSubmit={handleReturnSubmit} className="bg-white rounded-lg shadow p-5">
                <div className="font-semibold text-gray-900 mb-3">Registrar devolución</div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Condición</label>
                    <select
                      value={returnCondition}
                      onChange={(e) => setReturnCondition(e.target.value)}
                      className="mt-1 w-full border rounded-lg px-3 py-2"
                    >
                      <option value="excellent">Excelente</option>
                      <option value="good">Bueno</option>
                      <option value="fair">Regular</option>
                      <option value="poor">Malo</option>
                      <option value="damaged">Dañado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notas</label>
                    <input
                      value={returnNotes}
                      onChange={(e) => setReturnNotes(e.target.value)}
                      className="mt-1 w-full border rounded-lg px-3 py-2"
                      placeholder="Daños, observaciones..."
                    />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setReturnLoanId(null)}
                    className="px-4 py-2 border rounded-lg"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {loans.map((loan: Loan) => (
              <div key={loan.id} className="bg-white rounded-lg shadow p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-gray-900">Préstamo #{loan.id}</div>
                    <div className="text-sm text-gray-600">
                      Material: {loan.material_detail?.name || `Material ${loan.material}`}
                    </div>
                    <div className="text-sm text-gray-600">
                      Usuario: {loan.borrower_detail?.full_name || loan.borrower_detail?.email || 'N/D'}
                    </div>
                  </div>
                  <span className="text-xs uppercase font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-700">
                    {loan.status}
                  </span>
                </div>
                <div className="mt-3 text-sm text-gray-600">
                  <div>Cantidad: {loan.quantity_loaned}</div>
                  <div>Retorno esperado: {loan.expected_return_date || 'N/D'}</div>
                  {loan.is_overdue && <div className="text-red-600">Vencido</div>}
                </div>
                {!loan.is_consumable_loan && (loan.status === 'active' || loan.status === 'overdue') && (
                  <div className="mt-4">
                    <button
                      onClick={() => setReturnLoanId(loan.id)}
                      className="px-3 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700"
                    >
                      Registrar devolución
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'extensions' && (
          <div className="space-y-4">
            {loadingExtensions && <div>Cargando extensiones...</div>}
            {!loadingExtensions && extensions.length === 0 && (
              <div className="text-gray-600">No hay extensiones.</div>
            )}
            {extensions.map((ext: LoanExtension) => (
              <div key={ext.id} className="bg-white rounded-lg shadow p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-gray-900">Extensión #{ext.id}</div>
                    <div className="text-sm text-gray-600">
                      Solicita: {ext.requested_by_detail?.full_name || ext.requested_by_detail?.email || 'N/D'}
                    </div>
                  </div>
                  <span className="text-xs uppercase font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-700">
                    {ext.status}
                  </span>
                </div>
                <div className="mt-3 text-sm text-gray-600">
                  <div>Préstamo: #{ext.loan}</div>
                  <div>Nueva fecha: {ext.new_return_date || 'N/D'}</div>
                  {ext.reason && <div>Motivo: {ext.reason}</div>}
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleApproveExtension(ext.id)}
                    className="px-3 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700"
                  >
                    Aprobar
                  </button>
                  <button
                    onClick={() => handleRejectExtension(ext.id)}
                    className="px-3 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
