'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import { AuthResponse, LoginCredentials } from '@/types/auth'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Input } from '@/components/ui'
import { Button } from '@/components/ui'
import { Package, Lock, Mail } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
  })

  const loginMutation = useMutation({
    mutationFn: async (data: LoginCredentials) => {
      const response = await api.post('/auth/login/', data)
      return response.data
    },
    onSuccess: (data) => {
      if (data.success) {
        // Validar que solo inventaristas puedan acceder a la web
        if (data.data.user.user_type !== 'inventarista') {
          toast.error('Acceso denegado. Los empleados deben usar la aplicación móvil.')
          return
        }

        localStorage.setItem('access_token', data.data.tokens.access)
        localStorage.setItem('refresh_token', data.data.tokens.refresh)
        setAuth(data.data.user, data.data.tokens.access, data.data.tokens.refresh)
        toast.success('Inicio de sesión exitoso')
        router.push('/dashboard')
      }
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.errors?.non_field_errors?.[0] ||
        error.response?.data?.message ||
        'Error al iniciar sesión'
      toast.error(message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loginMutation.mutate(credentials)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-primary/5 -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent -z-10" />

      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Package className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Pack-a-Stock</h1>
          <p className="text-sm text-muted-foreground">
            Panel de Administración - Solo Inventaristas
          </p>
        </div>

        {/* Login Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Iniciar Sesión</CardTitle>
            <p className="text-sm text-muted-foreground text-center mt-2">
              Ingresa tus credenciales para continuar
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-foreground"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="text"
                    value={credentials.email}
                    onChange={(e) =>
                      setCredentials({ ...credentials, email: e.target.value })
                    }
                    placeholder="tu@email.com"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-foreground"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={credentials.password}
                    onChange={(e) =>
                      setCredentials({ ...credentials, password: e.target.value })
                    }
                    placeholder="••••••••"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full"
                size="lg"
              >
                {loginMutation.isPending ? 'Ingresando...' : 'Iniciar Sesión'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer Info */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          ¿Necesitas ayuda?{' '}
          <a
            href="#"
            className="text-primary hover:underline font-medium"
            onClick={(e) => {
              e.preventDefault()
              toast.info('Contacta al administrador')
            }}
          >
            Contacta soporte
          </a>
        </p>
      </div>
    </div>
  )
}
