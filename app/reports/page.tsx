'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import Link from 'next/link'

export default function ReportsPage() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
    }
  }, [router])

  const { data: materialsResponse = [] } = useQuery({
    queryKey: ['materials'],
    queryFn: async () => {
      const response = await api.get('/materials/materials/')
      return response.data
    },
  })

  const materials = Array.isArray(materialsResponse)
    ? materialsResponse
    : materialsResponse?.results ?? []

  const { data: loansResponse = [] } = useQuery({
    queryKey: ['loans'],
    queryFn: async () => {
      const response = await api.get('/loans/loans/')
      return response.data
    },
  })

  const loans = Array.isArray(loansResponse)
    ? loansResponse
    : loansResponse?.results ?? []

  const { data: requestsResponse = [] } = useQuery({
    queryKey: ['loan-requests'],
    queryFn: async () => {
      const response = await api.get('/loans/loan-requests/')
      return response.data
    },
  })

  const requests = Array.isArray(requestsResponse)
    ? requestsResponse
    : requestsResponse?.results ?? []

  const totalMaterials = materials.length
  const lowStock = materials.filter((m: any) => m.is_low_stock).length
  const overdueLoans = loans.filter((l: any) => l.status === 'overdue').length
  const pendingRequests = requests.filter((r: any) => r.status === 'pending').length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
              ← Volver
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500">Total materiales</div>
            <div className="text-3xl font-bold mt-2">{totalMaterials}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500">Stock bajo</div>
            <div className="text-3xl font-bold mt-2 text-amber-600">{lowStock}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500">Préstamos vencidos</div>
            <div className="text-3xl font-bold mt-2 text-red-600">{overdueLoans}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500">Solicitudes pendientes</div>
            <div className="text-3xl font-bold mt-2 text-orange-600">{pendingRequests}</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Préstamos vencidos</h2>
            {overdueLoans === 0 ? (
              <div className="text-gray-600">No hay préstamos vencidos.</div>
            ) : (
              <ul className="space-y-3">
                {loans
                  .filter((l: any) => l.status === 'overdue')
                  .slice(0, 10)
                  .map((loan: any) => (
                    <li key={loan.id} className="flex items-center justify-between text-sm">
                      <span>
                        #{loan.id} · {loan.material_detail?.name || 'Material'}
                      </span>
                      <span className="text-red-600">Vencido</span>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Top materiales por préstamos</h2>
            <div className="text-gray-600">Próximamente: ranking y exportación.</div>
          </div>
        </div>
      </main>
    </div>
  )
}
