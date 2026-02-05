'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated, user, clearAuth, initAuth } = useAuthStore()

  useEffect(() => {
    initAuth()
    
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router, initAuth])

  const handleLogout = () => {
    clearAuth()
    router.push('/login')
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-md">
        <div className="p-6">
          <h1 className="text-xl font-bold text-blue-600">Pack-a-Stock</h1>
        </div>

        <nav className="mt-6">
          <a
            href="/dashboard"
            className="block px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
          >
            Dashboard
          </a>
          <a
            href="/dashboard/materiales"
            className="block px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
          >
            Materiales
          </a>
          <a
            href="/dashboard/solicitudes"
            className="block px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
          >
            Solicitudes
          </a>
          <a
            href="/dashboard/prestamos"
            className="block px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600"
          >
            Préstamos
          </a>
        </nav>

        <div className="absolute bottom-0 w-64 border-t p-4">
          <div className="mb-2 text-sm">
            <p className="font-medium">{user?.first_name || user?.email}</p>
            <p className="text-gray-500">{user?.user_type}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200"
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
