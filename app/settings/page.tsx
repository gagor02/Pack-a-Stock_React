'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Badge } from '@/components/ui'
import {
  Settings as SettingsIcon,
  Building2,
  MapPin,
  Mail,
  Phone,
  CreditCard,
  Upload,
  Camera,
  Save,
  User,
  History,
  Trash2,
  CheckCircle,
  Sparkles,
  X,
  ImagePlus,
  MapPinPlus,
  ArrowRight,
  ScanFace,
  BookOpen,
} from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import BiometricEnrollmentModal from '@/components/biometrics/BiometricEnrollmentModal'

interface AccountForm {
  id: number
  company_name: string
  email: string
  phone: string
  street: string
  exterior_number: string
  interior_number?: string
  neighborhood: string
  postal_code: string
  city: string
  state: string
  country: string
  subscription_plan?: string
  max_users?: number
  max_locations?: number
}

export default function SettingsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { setCatalogMode } = useUIStore()
  const [formData, setFormData] = useState<AccountForm | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [logoHistory, setLogoHistory] = useState<string[]>([])
  const [showWelcome, setShowWelcome] = useState(false)
  const [showEnrollModal, setShowEnrollModal] = useState(false)

  // Detect new account for welcome banner
  useEffect(() => {
    const isNew = localStorage.getItem('new_account')
    if (isNew === 'true') {
      setShowWelcome(true)
    }
  }, [])

  const dismissWelcome = () => {
    setShowWelcome(false)
    localStorage.removeItem('new_account')
  }

  // Load logo history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pack-a-stock-logo-history')
      if (saved) setLogoHistory(JSON.parse(saved))
    } catch {}
  }, [])

  const saveLogoToHistory = (logoUrl: string) => {
    if (!logoUrl) return
    setLogoHistory((prev) => {
      const filtered = prev.filter((url) => url !== logoUrl)
      const updated = [logoUrl, ...filtered].slice(0, 5) // Keep last 5
      localStorage.setItem('pack-a-stock-logo-history', JSON.stringify(updated))
      return updated
    })
  }

  const removeLogoFromHistory = (logoUrl: string) => {
    setLogoHistory((prev) => {
      const updated = prev.filter((url) => url !== logoUrl)
      localStorage.setItem('pack-a-stock-logo-history', JSON.stringify(updated))
      return updated
    })
  }

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
    }
  }, [router])

  const { data: accountsResponse = [], isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const response = await api.get('/accounts/accounts/')
      return response.data
    },
    retry: 1,
    staleTime: 30000,
  })

  const { data: biometricStatus } = useQuery<{ enrolled: boolean; enrolled_at: string | null }>({
    queryKey: ['biometric-status'],
    queryFn: async () => {
      const { data } = await api.get('/auth/biometrics/status/')
      return data
    },
    staleTime: 60_000,
  })

  const accounts = Array.isArray(accountsResponse)
    ? accountsResponse
    : accountsResponse?.results ?? []

  useEffect(() => {
    if (accounts && accounts.length > 0) {
      setFormData(accounts[0])
    }
  }, [accounts])

  const updateMutation = useMutation({
    mutationFn: async (data: AccountForm) => {
      // Exclude logo and read-only fields - logo is uploaded separately via FormData
      const { id, subscription_plan, max_users, max_locations, ...cleanData } = data as any
      // Also remove logo if it's a URL string (not a file)
      delete cleanData.logo
      delete cleanData.created_at
      delete cleanData.updated_at
      delete cleanData.is_active
      delete cleanData.subscription_start_date
      delete cleanData.subscription_end_date
      const response = await api.patch(`/accounts/accounts/${id}/`, cleanData)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      toast.success('Cuenta actualizada exitosamente')
      setIsEditing(false)
    },
    onError: (error: any) => {
      const detail = error.response?.data
      const msg = typeof detail === 'object' ? Object.values(detail).flat().join(', ') : detail?.message
      toast.error(msg || 'Error al actualizar cuenta')
    },
  })

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUploadLogo = async () => {
    if (!logoFile || !formData) return
    try {
      // Save current logo to history before replacing
      const currentLogo = accounts[0]?.logo
      if (currentLogo) {
        saveLogoToHistory(currentLogo)
      }

      const fd = new FormData()
      fd.append('logo', logoFile)
      await api.patch(`/accounts/accounts/${formData.id}/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['account'] })
      toast.success('Logo actualizado exitosamente')
      setLogoFile(null)
      setLogoPreview(null)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al subir logo')
    }
  }

  const handleRestoreLogo = async (logoUrl: string) => {
    if (!formData) return
    try {
      // Save current logo to history
      const currentLogo = accounts[0]?.logo
      if (currentLogo) {
        saveLogoToHistory(currentLogo)
      }

      // Fetch the old logo file and re-upload it
      const response = await fetch(logoUrl)
      const blob = await response.blob()
      const fileName = logoUrl.split('/').pop() || 'logo.png'
      const file = new File([blob], fileName, { type: blob.type })

      const fd = new FormData()
      fd.append('logo', file)
      await api.patch(`/accounts/accounts/${formData.id}/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['account'] })
      toast.success('Logo restaurado exitosamente')
      setLogoPreview(null)
      setLogoFile(null)
    } catch (error: any) {
      toast.error('Error al restaurar logo')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData) return
    updateMutation.mutate(formData)
    if (logoFile) {
      handleUploadLogo()
    }
  }

  if (isLoading || !formData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <SettingsIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Configuración</h1>
              <p className="text-xs text-muted-foreground">Administra la información de tu empresa</p>
            </div>
          </div>
          <div className="flex gap-2">
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)}>
                <SettingsIcon className="h-4 w-4 mr-2" />
                Editar
              </Button>
            ) : (
              <>
                <Button onClick={() => setIsEditing(false)} variant="secondary">Cancelar</Button>
                <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Welcome Banner for New Accounts */}
        {showWelcome && (
          <div className="relative p-5 rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5">
            <button
              onClick={dismissWelcome}
              className="absolute top-3 right-3 p-1 rounded-lg hover:bg-primary/10 transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-primary/15 rounded-xl border border-primary/20">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-foreground mb-1">
                  Bienvenido a Pack-a-Stock
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Tu cuenta fue creada exitosamente. Completa estos pasos para comenzar a usar el sistema:
                </p>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div
                    className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => { setIsEditing(true); dismissWelcome() }}
                  >
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <ImagePlus className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Sube tu logo</p>
                      <p className="text-xs text-muted-foreground">Personaliza tu empresa</p>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => { setIsEditing(true); dismissWelcome() }}
                  >
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <MapPinPlus className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Agrega dirección</p>
                      <p className="text-xs text-muted-foreground">Completa tu info</p>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => { dismissWelcome(); router.push('/locations') }}
                  >
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Crea ubicaciones</p>
                      <p className="text-xs text-muted-foreground">Organiza tu inventario</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-3">

          {/* Left Column */}
          <div className="lg:col-span-1 flex flex-col gap-3">

            {/* Profile Card */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-4 mb-3">
                  <div className="relative flex-shrink-0">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden border-4 border-primary/20">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                      ) : accounts[0]?.logo ? (
                        <img src={accounts[0].logo} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="h-10 w-10 text-primary/60" />
                      )}
                    </div>
                    {isEditing && (
                      <label className="absolute bottom-0 right-0 p-1.5 bg-primary rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
                        <Camera className="h-3 w-3 text-primary-foreground" />
                        <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                      </label>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground truncate">{formData.company_name}</h3>
                    <p className="text-xs text-muted-foreground truncate">{formData.email}</p>
                    <Badge variant="default" className="mt-1 text-xs">
                      <CreditCard className="h-3 w-3 mr-1" />
                      {{ freemium: 'Freemium', monthly: 'Mensual', quarterly: 'Trimestral', annual: 'Anual' }[formData.subscription_plan || ''] || 'Freemium'}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Usuarios</span>
                    <span className="font-medium">{formData.max_users === -1 ? '∞' : formData.max_users ?? 5}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ubicaciones</span>
                    <span className="font-medium">{formData.max_locations === -1 ? '∞' : formData.max_locations ?? 1}</span>
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2 pt-1 border-t border-border/50">
                    <Phone className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <span className="text-muted-foreground truncate">{formData.phone || 'Sin teléfono'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2">
                    <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <span className="text-muted-foreground truncate">
                      {formData.city && formData.state ? `${formData.city}, ${formData.state}` : 'Sin ubicación'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Biometric Card — compact */}
            <Card className={biometricStatus?.enrolled ? 'border-green-500/30' : 'border-amber-500/30'}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ScanFace className={`h-4 w-4 ${biometricStatus?.enrolled ? 'text-green-400' : 'text-amber-400'}`} />
                  <span className="text-sm font-medium text-foreground">Verificación Biométrica</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`flex-1 flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${
                    biometricStatus?.enrolled
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {biometricStatus?.enrolled
                      ? <><CheckCircle className="h-3.5 w-3.5" /><span>Registrado</span></>
                      : <><ScanFace className="h-3.5 w-3.5" /><span>No registrado</span></>}
                  </div>
                  <button
                    onClick={() => setShowEnrollModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium rounded-lg transition-colors flex-shrink-0"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    {biometricStatus?.enrolled ? 'Actualizar' : 'Registrar'}
                  </button>
                </div>
                {biometricStatus?.enrolled_at && (
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    Registrado el {new Date(biometricStatus.enrolled_at).toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Logo History */}
            {logoHistory.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <History className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Logos Recientes</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {logoHistory.map((url, index) => (
                      <div key={index} className="group relative aspect-square rounded-lg border border-border overflow-hidden bg-white">
                        <img src={url} alt={`Logo ${index + 1}`} className="w-full h-full object-contain p-1" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                          <button onClick={() => handleRestoreLogo(url)} className="p-1 bg-primary rounded-full hover:bg-primary/80" title="Restaurar">
                            <CheckCircle className="h-2.5 w-2.5 text-primary-foreground" />
                          </button>
                          <button onClick={() => removeLogoFromHistory(url)} className="p-1 bg-red-600 rounded-full hover:bg-red-500" title="Eliminar">
                            <Trash2 className="h-2.5 w-2.5 text-white" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column — all fields in one card */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardContent className="p-4 h-full flex flex-col gap-4">

                {/* General */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Información General</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Empresa', field: 'company_name', colSpan: 2 },
                      { label: 'Teléfono', field: 'phone', placeholder: '(55) 1234-5678' },
                      { label: 'Email', field: 'email', type: 'email', colSpan: 2 },
                      { label: 'Plan', field: '_plan', disabled: true },
                    ].map(({ label, field, type, colSpan, placeholder, disabled }) => (
                      <div key={field} className={colSpan === 2 ? 'col-span-2' : ''}>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
                        <Input
                          type={type || 'text'}
                          value={field === '_plan'
                            ? ({ freemium: 'Freemium', monthly: 'Mensual', quarterly: 'Trimestral', annual: 'Anual' }[(formData.subscription_plan || '') as string] || 'Freemium')
                            : (formData as any)[field] ?? ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            field !== '_plan' && setFormData({ ...formData, [field]: e.target.value })
                          }
                          disabled={!isEditing || !!disabled}
                          placeholder={placeholder}
                          className={disabled ? 'bg-secondary/20' : ''}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border/50" />

                {/* Address */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Dirección</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Calle', field: 'street', colSpan: 2 },
                      { label: 'Núm. Ext.', field: 'exterior_number' },
                      { label: 'Colonia', field: 'neighborhood', colSpan: 2 },
                      { label: 'Núm. Int.', field: 'interior_number', placeholder: 'Opcional' },
                      { label: 'Ciudad', field: 'city' },
                      { label: 'Estado', field: 'state' },
                      { label: 'CP', field: 'postal_code' },
                      { label: 'País', field: 'country', colSpan: 2 },
                    ].map(({ label, field, colSpan, placeholder }) => (
                      <div key={field} className={colSpan === 2 ? 'col-span-2' : ''}>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
                        <Input
                          value={(formData as any)[field] ?? ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData({ ...formData, [field]: e.target.value })
                          }
                          disabled={!isEditing}
                          placeholder={placeholder}
                        />
                      </div>
                    ))}
                  </div>
                </div>

              </CardContent>
            </Card>
          </div>

        </div>
      </div>

      {/* Presentation Tools — hidden section */}
      <div className="mt-2 border-t border-border/30 pt-6">
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors list-none select-none">
            <span className="text-[10px] uppercase tracking-widest">Herramientas de presentación</span>
            <span className="ml-1 group-open:rotate-90 transition-transform text-[10px]">›</span>
          </summary>
          <div className="mt-4">
            <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
                      <BookOpen className="h-5 w-5 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Modo Catálogo</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Pantalla completa con galería de materiales, fotos y códigos QR escaneables
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setCatalogMode(true)}
                    className="flex-shrink-0 bg-violet-600 hover:bg-violet-700 text-white border-0"
                    size="lg"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Abrir catálogo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </details>
      </div>

      <BiometricEnrollmentModal
        isOpen={showEnrollModal}
        onClose={() => setShowEnrollModal(false)}
      />
    </DashboardLayout>
  )
}
