'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Pequeño delay para asegurar que localStorage esté disponible
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('access_token')
        if (token) {
          router.replace('/dashboard')
        } else {
          router.replace('/login')
        }
      } catch (error) {
        router.replace('/login')
      } finally {
        setIsChecking(false)
      }
    }

    // Ejecutar inmediatamente
    checkAuth()
  }, [router])

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return null
}
