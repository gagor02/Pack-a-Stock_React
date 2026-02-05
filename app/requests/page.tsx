'use client'

import { useEffect, useMemo, useState } from 'react'
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

type TabKey = 'pending' | 'approved' | 'rejected' | 'all'

export default function RequestsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabKey>('pending')

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

  const requests = Array.isArray(requestsResponse)
    ? requestsResponse
    : requestsResponse?.results ?? []

  const approveMutation = useMutation({
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

  const rejectMutation = useMutation({
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

  const filteredRequests = useMemo(() => {
    if (activeTab === 'all') return requests
    return requests.filter((req: LoanRequest) => req.status === activeTab)
  }, [activeTab, requests])

  const handleApprove = (id: number) => {
    const notes = prompt('Notas (opcional):') || ''
    approveMutation.mutate({ id, notes })
  }

  const handleReject = (id: number) => {
    const notes = prompt('Motivo del rechazo (opcional):') || ''
    rejectMutation.mutate({ id, notes })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
              ← Volver
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Solicitudes de Préstamo</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap gap-2 mb-6">
          {(['pending', 'approved', 'rejected', 'all'] as TabKey[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                activeTab === tab ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'
              }`}
            >
              {tab === 'pending' && 'Pendientes'}
              {tab === 'approved' && 'Aprobadas'}
              {tab === 'rejected' && 'Rechazadas'}
              {tab === 'all' && 'Todas'}
            </button>
          ))}
        </div>

        {isLoading && <div>Cargando solicitudes...</div>}
        {!isLoading && filteredRequests.length === 0 && (
          <div className="text-gray-600">No hay solicitudes para esta vista.</div>
        )}

        <div className="space-y-4">
          {filteredRequests.map((req: LoanRequest) => (
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
              {req.status === 'pending' && (
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
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
