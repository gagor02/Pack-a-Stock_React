'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import { auth, googleProvider } from '@/lib/firebase'
import { signInWithPopup } from 'firebase/auth'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui'
import {
  Package, User, Mail, Lock, Building2, Phone,
  ArrowRight, ArrowLeft, CheckCircle, Boxes, BarChart3, Shield,
} from 'lucide-react'

interface RegisterData {
  email: string
  password: string
  full_name: string
  company_name: string
  phone: string
}

type Step = 1 | 2

export default function RegisterPage() {
  const router = useRouter()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [step, setStep] = useState<Step>(1)
  const [formData, setFormData] = useState<RegisterData>({
    email: '',
    password: '',
    full_name: '',
    company_name: '',
    phone: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleToken, setGoogleToken] = useState<string | null>(null)
  const [googleEmail, setGoogleEmail] = useState('')

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const response = await api.post('/auth/register/', data)
      return response.data
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Cuenta creada exitosamente')
        localStorage.setItem('access_token', data.data.tokens.access)
        localStorage.setItem('refresh_token', data.data.tokens.refresh)
        localStorage.setItem('new_account', 'true')
        setAuth(data.data.user, data.data.tokens.access, data.data.tokens.refresh)
        router.push('/settings')
      }
    },
    onError: (error: any) => {
      const errs = error.response?.data?.errors
      if (errs) {
        if (errs.email && Array.isArray(errs.email)) {
          toast.error(errs.email[0])
        } else {
          Object.entries(errs).forEach(([, messages]: [string, any]) => {
            if (Array.isArray(messages)) {
              messages.forEach((msg) => toast.error(msg))
            }
          })
        }
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error('Error al crear la cuenta')
      }
    },
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    // Clear error on change
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' })
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
    setFormData({ ...formData, phone: digits })
    if (errors.phone) {
      setErrors({ ...errors, phone: '' })
    }
  }

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'El nombre es requerido'
    } else if (formData.full_name.trim().length < 3) {
      newErrors.full_name = 'El nombre debe tener al menos 3 caracteres'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Ingresa un email válido'
    }

    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Mínimo 8 caracteres'
    }

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) {
      toast.error(Object.values(newErrors)[0])
      return false
    }
    return true
  }

  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.company_name.trim()) {
      newErrors.company_name = 'El nombre de la empresa es requerido'
    }

    if (formData.phone && formData.phone.length !== 10) {
      newErrors.phone = 'El teléfono debe tener 10 dígitos'
    }

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) {
      toast.error(Object.values(newErrors)[0])
      return false
    }
    return true
  }

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateStep2()) return

    if (googleToken) {
      // Registro via Google — usar endpoint firebase
      if (!formData.company_name.trim()) {
        toast.error('El nombre de la empresa es requerido')
        return
      }
      googleRegisterMutation.mutate({
        firebase_token: googleToken,
        user_type: 'inventarista',
        company_name: formData.company_name,
        full_name: formData.full_name,
      })
    } else {
      registerMutation.mutate(formData)
    }
  }

  const googleRegisterMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const response = await api.post('/auth/firebase/', data)
      return response.data
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Cuenta creada exitosamente')
        localStorage.setItem('access_token', data.data.tokens.access)
        localStorage.setItem('refresh_token', data.data.tokens.refresh)
        localStorage.setItem('new_account', 'true')
        setAuth(data.data.user, data.data.tokens.access, data.data.tokens.refresh)
        router.push('/settings')
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear la cuenta')
    },
  })

  const handleGoogleRegister = async () => {
    setGoogleLoading(true)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const token = await result.user.getIdToken()
      const name = result.user.displayName || ''
      const email = result.user.email || ''
      setGoogleToken(token)
      setGoogleEmail(email)
      setFormData((prev) => ({ ...prev, full_name: name, email, password: 'firebase-auth' }))
      setStep(2) // saltar directo a datos de empresa
      toast.success(`Cuenta Google vinculada: ${email}`)
    } catch (error: any) {
      if (error?.code !== 'auth/popup-closed-by-user') {
        toast.error('Error al conectar con Google')
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  const inputClass = "w-full rounded-xl border-2 border-border bg-card px-5 py-3.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
  const inputWithIconClass = `${inputClass} pl-12`
  const inputErrorClass = "border-red-500 focus:ring-red-500 focus:border-red-500"
  const labelClass = "block text-sm font-medium text-foreground mb-2 uppercase tracking-wider"

  const steps = [
    { number: 1, label: 'Personal' },
    { number: 2, label: 'Empresa' },
  ]

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Register Form */}
      <div className="flex-1 flex items-center justify-center bg-background p-6 lg:p-12">
        <div className="w-full max-w-lg space-y-6">
          {/* Logo */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
                <Package className="h-7 w-7 text-primary" />
              </div>
              <span className="text-2xl font-bold text-foreground tracking-tight">Pack-a-Stock</span>
            </div>

            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Crea tu cuenta
            </h1>
            <p className="text-base text-muted-foreground mt-2">
              Registra tu empresa y empieza a gestionar tu inventario
            </p>
          </div>

          {/* Google Register — solo mostrar en step 1 sin google vinculado */}
          {step === 1 && !googleToken && (
            <>
              <button
                type="button"
                onClick={handleGoogleRegister}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 rounded-xl border-2 border-border bg-card px-5 py-3.5 text-base font-medium text-foreground hover:bg-secondary/50 transition-colors disabled:opacity-50"
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
                {googleLoading ? 'Conectando...' : 'Registrarse con Google'}
              </button>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-sm text-muted-foreground">o con email</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>
            </>
          )}

          {/* Indicador de cuenta Google vinculada en step 2 */}
          {googleToken && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-xl border border-green-500/20">
              <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="text-sm text-green-600 font-medium">Google: {googleEmail}</span>
            </div>
          )}

          {/* Step Indicator */}
          <div className="flex items-center gap-2">
            {steps.map((s, i) => (
              <div key={s.number} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-colors ${
                  step >= s.number
                    ? 'bg-primary text-white'
                    : 'bg-secondary/50 text-muted-foreground'
                }`}>
                  {step > s.number ? <CheckCircle className="h-4 w-4" /> : s.number}
                </div>
                <span className={`text-sm font-medium ${
                  step >= s.number ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {s.label}
                </span>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 rounded ${
                    step > s.number ? 'bg-primary' : 'bg-border'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Step 1: Personal Data */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <label htmlFor="full_name" className={labelClass}>Nombre Completo *</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      id="full_name"
                      name="full_name"
                      type="text"
                      value={formData.full_name}
                      onChange={handleChange}
                      placeholder="Juan Perez"
                      className={`${inputWithIconClass} ${errors.full_name ? inputErrorClass : ''}`}
                    />
                  </div>
                  {errors.full_name && <p className="text-sm text-red-400 mt-1">{errors.full_name}</p>}
                </div>
                <div>
                  <label htmlFor="email" className={labelClass}>Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="tu@empresa.com"
                      className={`${inputWithIconClass} ${errors.email ? inputErrorClass : ''}`}
                    />
                  </div>
                  {errors.email && <p className="text-sm text-red-400 mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label htmlFor="password" className={labelClass}>Contraseña *</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Mínimo 8 caracteres"
                      className={`${inputWithIconClass} ${errors.password ? inputErrorClass : ''}`}
                    />
                  </div>
                  {errors.password && <p className="text-sm text-red-400 mt-1">{errors.password}</p>}
                </div>
              </div>
            )}

            {/* Step 2: Company Data */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <label htmlFor="company_name" className={labelClass}>Nombre de la Empresa *</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      id="company_name"
                      name="company_name"
                      type="text"
                      value={formData.company_name}
                      onChange={handleChange}
                      placeholder="Mi Empresa S.A."
                      className={`${inputWithIconClass} ${errors.company_name ? inputErrorClass : ''}`}
                    />
                  </div>
                  {errors.company_name && <p className="text-sm text-red-400 mt-1">{errors.company_name}</p>}
                </div>
                <div>
                  <label htmlFor="phone" className={labelClass}>Teléfono (10 dígitos)</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      placeholder="5512345678"
                      maxLength={10}
                      className={`${inputWithIconClass} ${errors.phone ? inputErrorClass : ''}`}
                    />
                  </div>
                  {errors.phone ? (
                    <p className="text-sm text-red-400 mt-1">{errors.phone}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">{formData.phone.length}/10 dígitos</p>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-4 pt-2">
              {step > 1 && (
                <Button
                  type="button"
                  onClick={() => setStep((step - 1) as Step)}
                  variant="secondary"
                  size="lg"
                  className="text-base px-6"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Atrás
                </Button>
              )}
              {step < 2 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  size="lg"
                  className="flex-1 text-base"
                >
                  Siguiente
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={registerMutation.isPending || googleRegisterMutation.isPending}
                  size="lg"
                  className="flex-1 text-base"
                >
                  {(registerMutation.isPending || googleRegisterMutation.isPending) ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                      Creando cuenta...
                    </>
                  ) : (
                    <>
                      Crear Cuenta
                      <CheckCircle className="h-5 w-5 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>

          {/* Login Link */}
          <div className="text-center pt-4 border-t border-border/50">
            <p className="text-base text-muted-foreground">
              ¿Ya tienes cuenta?{' '}
              <Link
                href="/login"
                className="text-primary hover:underline font-semibold"
              >
                Inicia sesión
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
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16">
          <div className="space-y-8">
            <div className="p-4 bg-white/10 rounded-2xl w-fit backdrop-blur-sm border border-white/20">
              <Package className="h-12 w-12 text-white" />
            </div>

            <div>
              <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
                Empieza a<br />controlar tu<br />inventario hoy
              </h2>
              <p className="text-lg text-white/70 mt-4 max-w-sm">
                Crea tu cuenta gratis y organiza materiales, préstamos y ubicaciones.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="space-y-3 pt-4">
              <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Boxes className="h-5 w-5 text-white" />
                </div>
                <span className="text-white/90 font-medium">Registro rápido y sin costo</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                <div className="p-2 bg-white/10 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <span className="text-white/90 font-medium">Plan gratuito para comenzar</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <span className="text-white/90 font-medium">Tus datos seguros y protegidos</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
