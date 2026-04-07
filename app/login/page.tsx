'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import { auth, googleProvider } from '@/lib/firebase'
import { signInWithPopup } from 'firebase/auth'
import { AuthResponse, LoginCredentials } from '@/types/auth'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { Button } from '@/components/ui'
import { Package, Lock, Mail, ArrowRight, BarChart3, Shield, Boxes } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
  })
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleHint, setGoogleHint] = useState(false)

  const loginMutation = useMutation({
    mutationFn: async (data: LoginCredentials) => {
      const response = await api.post('/auth/login/', data)
      return response.data
    },
    onSuccess: (data) => {
      if (data.success) {
        const user = data.data.user

        // Superadmin goes to admin panel
        if (user.is_superuser) {
          localStorage.setItem('access_token', data.data.tokens.access)
          localStorage.setItem('refresh_token', data.data.tokens.refresh)
          setAuth(user, data.data.tokens.access, data.data.tokens.refresh)
          toast.success('Bienvenido, Administrador')
          router.push('/admin')
          return
        }

        // Only inventaristas can access the web panel
        if (user.user_type !== 'inventarista') {
          toast.error('Acceso denegado. Los empleados deben usar la aplicacion movil.')
          return
        }

        localStorage.setItem('access_token', data.data.tokens.access)
        localStorage.setItem('refresh_token', data.data.tokens.refresh)
        setAuth(user, data.data.tokens.access, data.data.tokens.refresh)
        toast.success('Inicio de sesion exitoso')
        router.push('/dashboard')
      }
    },
    onError: async (error: any) => {
      const status = error.response?.status
      // Check if this email uses Google Sign-In
      if (status === 400 || status === 401) {
        try {
          const { data } = await api.post('/auth/check-method/', { email: credentials.email })
          if (data.exists && data.uses_google) {
            setGoogleHint(true)
            return
          }
        } catch {}
      }
      const message =
        error.response?.data?.errors?.non_field_errors?.[0] ||
        error.response?.data?.message ||
        'Error al iniciar sesion'
      toast.error(message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loginMutation.mutate(credentials)
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const firebaseToken = await result.user.getIdToken()

      const { data } = await api.post('/auth/firebase/', { firebase_token: firebaseToken })

      if (data.success) {
        const user = data.data.user

        if (user.is_superuser) {
          localStorage.setItem('access_token', data.data.tokens.access)
          localStorage.setItem('refresh_token', data.data.tokens.refresh)
          setAuth(user, data.data.tokens.access, data.data.tokens.refresh)
          toast.success('Bienvenido, Administrador')
          router.push('/admin')
          return
        }

        if (user.user_type !== 'inventarista') {
          toast.error('Acceso denegado. Los empleados deben usar la aplicacion movil.')
          return
        }

        localStorage.setItem('access_token', data.data.tokens.access)
        localStorage.setItem('refresh_token', data.data.tokens.refresh)
        setAuth(user, data.data.tokens.access, data.data.tokens.refresh)
        toast.success('Inicio de sesion exitoso')
        router.push('/dashboard')
      }
    } catch (error: any) {
      if (error?.response?.data?.code === 'USER_NOT_FOUND') {
        toast.error('No tienes cuenta. Regístrate primero.')
        router.push('/register')
      } else if (error?.code === 'auth/popup-closed-by-user') {
        // user closed popup, do nothing
      } else {
        toast.error('Error al iniciar sesion con Google')
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-background p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
                <Package className="h-7 w-7 text-primary" />
              </div>
              <span className="text-2xl font-bold text-foreground tracking-tight">Pack-a-Stock</span>
            </div>

            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Bienvenido de vuelta
            </h1>
            <p className="text-base text-muted-foreground mt-2">
              Ingresa tus credenciales para acceder al panel
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground mb-2 uppercase tracking-wider"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  id="email"
                  type="text"
                  value={credentials.email}
                  onChange={(e) => {
                    setCredentials({ ...credentials, email: e.target.value })
                    setGoogleHint(false)
                  }}
                  placeholder="tu@email.com"
                  required
                  className="w-full rounded-xl border-2 border-border bg-card px-5 py-3.5 pl-12 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-foreground mb-2 uppercase tracking-wider"
              >
                Contrasena
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  id="password"
                  type="password"
                  value={credentials.password}
                  onChange={(e) =>
                    setCredentials({ ...credentials, password: e.target.value })
                  }
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border-2 border-border bg-card px-5 py-3.5 pl-12 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                />
              </div>
            </div>

            {googleHint && (
              <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <svg className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-600">Esta cuenta usa Google Sign-In</p>
                  <p className="text-xs text-amber-500/80 mt-0.5">Usa el botón <strong>"Continuar con Google"</strong> para iniciar sesión.</p>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full text-base"
              size="lg"
            >
              {loginMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Ingresando...
                </>
              ) : (
                <>
                  Iniciar Sesion
                  <ArrowRight className="h-5 w-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border/50" />
            <span className="text-sm text-muted-foreground">o continua con</span>
            <div className="flex-1 h-px bg-border/50" />
          </div>

          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loginMutation.isPending}
            className="w-full flex items-center justify-center gap-3 rounded-xl border-2 border-border bg-card px-5 py-3.5 text-base font-medium text-foreground hover:bg-secondary/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-foreground" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {googleLoading ? 'Conectando...' : 'Continuar con Google'}
          </button>

          {/* Register Link */}
          <div className="text-center pt-4 border-t border-border/50">
            <p className="text-base text-muted-foreground">
              ¿No tienes cuenta?{' '}
              <Link
                href="/register"
                className="text-primary hover:underline font-semibold"
              >
                Registrate aqui
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Decorative Column */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-primary/60" />

        {/* Geometric Shapes */}
        <div className="absolute top-20 right-20 w-64 h-64 rounded-full bg-white/10 blur-sm" />
        <div className="absolute bottom-32 left-16 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute top-1/2 right-10 w-32 h-32 rounded-2xl bg-white/10 rotate-45" />
        <div className="absolute top-40 left-20 w-20 h-20 rounded-xl bg-white/10 rotate-12" />
        <div className="absolute bottom-20 right-32 w-16 h-16 rounded-full bg-white/15" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center px-10 xl:px-14 text-center">
          <div className="space-y-8 w-full">
            {/* Logo */}
            <Image src="/logocompletoblanco.png" alt="Pack-a-Stock" width={1136} height={928} className="h-52 w-auto object-contain mx-auto" style={{ mixBlendMode: 'screen' }} />

            <div>
              <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
                Gestiona tu<br />inventario<br />con facilidad
              </h2>
              <p className="text-lg text-white/70 mt-4 max-w-sm mx-auto">
                Controla materiales, prestamos y ubicaciones desde un solo lugar.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="space-y-3 pt-4">
              <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                <div className="p-2 bg-white/10 rounded-lg flex-shrink-0">
                  <Boxes className="h-5 w-5 text-white" />
                </div>
                <span className="text-white/90 font-medium text-left">Control de inventario en tiempo real</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                <div className="p-2 bg-white/10 rounded-lg flex-shrink-0">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <span className="text-white/90 font-medium text-left">Reportes y estadisticas detalladas</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                <div className="p-2 bg-white/10 rounded-lg flex-shrink-0">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <span className="text-white/90 font-medium text-left">Auditoria y rastreo completo</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
