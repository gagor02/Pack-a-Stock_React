'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui'
import {
  Package, User, Mail, Lock, Building2, Phone, MapPin,
  ArrowRight, ArrowLeft, CheckCircle, Boxes, BarChart3, Shield,
} from 'lucide-react'

interface RegisterData {
  email: string
  password: string
  full_name: string
  company_name: string
  phone: string
  street: string
  exterior_number: string
  interior_number: string
  neighborhood: string
  postal_code: string
  city: string
  state: string
  country: string
}

type Step = 1 | 2 | 3

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
    street: '',
    exterior_number: '',
    interior_number: '',
    neighborhood: '',
    postal_code: '',
    city: '',
    state: '',
    country: 'Mexico',
  })

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
        setAuth(data.data.user, data.data.tokens.access, data.data.tokens.refresh)
        router.push('/dashboard')
      }
    },
    onError: (error: any) => {
      const errors = error.response?.data?.errors
      if (errors) {
        if (errors.email && Array.isArray(errors.email)) {
          toast.error(errors.email[0])
        } else {
          Object.entries(errors).forEach(([field, messages]: [string, any]) => {
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
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleNext = () => {
    if (step === 1) {
      if (!formData.full_name || !formData.email || !formData.password) {
        toast.error('Completa todos los campos requeridos')
        return
      }
      if (formData.password.length < 8) {
        toast.error('La contrasena debe tener al menos 8 caracteres')
        return
      }
      setStep(2)
    } else if (step === 2) {
      if (!formData.company_name) {
        toast.error('El nombre de la empresa es requerido')
        return
      }
      setStep(3)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    registerMutation.mutate(formData)
  }

  const inputClass = "w-full rounded-xl border-2 border-border bg-card px-5 py-3.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
  const inputWithIconClass = `${inputClass} pl-12`
  const labelClass = "block text-sm font-medium text-foreground mb-2 uppercase tracking-wider"

  const steps = [
    { number: 1, label: 'Personal' },
    { number: 2, label: 'Empresa' },
    { number: 3, label: 'Direccion' },
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
                <span className={`text-sm font-medium hidden sm:block ${
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
                      required
                      placeholder="Juan Perez"
                      className={inputWithIconClass}
                    />
                  </div>
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
                      required
                      placeholder="tu@empresa.com"
                      className={inputWithIconClass}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="password" className={labelClass}>Contrasena *</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength={8}
                      placeholder="Minimo 8 caracteres"
                      className={inputWithIconClass}
                    />
                  </div>
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
                      required
                      placeholder="Mi Empresa S.A."
                      className={inputWithIconClass}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="phone" className={labelClass}>Telefono</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+52 55 1234 5678"
                      className={inputWithIconClass}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Address */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <label htmlFor="street" className={labelClass}>Calle</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      id="street"
                      name="street"
                      type="text"
                      value={formData.street}
                      onChange={handleChange}
                      placeholder="Av. Principal"
                      className={inputWithIconClass}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="exterior_number" className={labelClass}>Num. Exterior</label>
                    <input
                      id="exterior_number"
                      name="exterior_number"
                      type="text"
                      value={formData.exterior_number}
                      onChange={handleChange}
                      placeholder="123"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="interior_number" className={labelClass}>Num. Interior</label>
                    <input
                      id="interior_number"
                      name="interior_number"
                      type="text"
                      value={formData.interior_number}
                      onChange={handleChange}
                      placeholder="A-101"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="neighborhood" className={labelClass}>Colonia</label>
                    <input
                      id="neighborhood"
                      name="neighborhood"
                      type="text"
                      value={formData.neighborhood}
                      onChange={handleChange}
                      placeholder="Centro"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="postal_code" className={labelClass}>Codigo Postal</label>
                    <input
                      id="postal_code"
                      name="postal_code"
                      type="text"
                      value={formData.postal_code}
                      onChange={handleChange}
                      placeholder="12345"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="city" className={labelClass}>Ciudad</label>
                    <input
                      id="city"
                      name="city"
                      type="text"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="CDMX"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="state" className={labelClass}>Estado</label>
                    <input
                      id="state"
                      name="state"
                      type="text"
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="CDMX"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="country" className={labelClass}>Pais</label>
                    <input
                      id="country"
                      name="country"
                      type="text"
                      value={formData.country}
                      onChange={handleChange}
                      placeholder="Mexico"
                      className={inputClass}
                    />
                  </div>
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
                  Atras
                </Button>
              )}
              {step < 3 ? (
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
                  disabled={registerMutation.isPending}
                  size="lg"
                  className="flex-1 text-base"
                >
                  {registerMutation.isPending ? (
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
                Inicia sesion
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
                Crea tu cuenta gratis y organiza materiales, prestamos y ubicaciones.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="space-y-3 pt-4">
              <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Boxes className="h-5 w-5 text-white" />
                </div>
                <span className="text-white/90 font-medium">Registro rapido y sin costo</span>
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
