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
} from 'lucide-react'

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
  const [formData, setFormData] = useState<AccountForm | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [logoHistory, setLogoHistory] = useState<string[]>([])

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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <SettingsIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
              <p className="text-sm text-muted-foreground">
                Administra la información de tu empresa
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} size="lg">
                <SettingsIcon className="h-5 w-5 mr-2" />
                Editar Información
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => setIsEditing(false)}
                  variant="secondary"
                  size="lg"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={updateMutation.isPending}
                  size="lg"
                >
                  <Save className="h-5 w-5 mr-2" />
                  {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Company Profile */}
          <div className="lg:col-span-1 space-y-6">
            {/* Company Logo Card */}
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="relative inline-block mb-4">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto overflow-hidden border-4 border-primary/20">
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Logo"
                          className="w-full h-full object-cover"
                        />
                      ) : accounts[0]?.logo ? (
                        <img
                          src={accounts[0].logo}
                          alt="Logo"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Building2 className="h-16 w-16 text-primary/60" />
                      )}
                    </div>
                    {isEditing && (
                      <label className="absolute bottom-0 right-0 p-2 bg-primary rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
                        <Camera className="h-4 w-4 text-primary-foreground" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {isEditing && (
                    <p className="text-xs text-muted-foreground mb-2">
                      Este logo aparecerá en las etiquetas impresas
                    </p>
                  )}

                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {formData.company_name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {formData.email}
                  </p>

                  {/* Plan Badge */}
                  <Badge variant="default" className="mb-2">
                    <CreditCard className="h-3 w-3 mr-1" />
                    Plan {{ freemium: 'Freemium', monthly: 'Mensual', quarterly: 'Trimestral', annual: 'Anual' }[formData.subscription_plan || ''] || 'Freemium'}
                  </Badge>

                  {/* Limits */}
                  <div className="mt-4 pt-4 border-t border-border space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Usuarios max.</span>
                      <span className="font-medium text-foreground">
                        {formData.max_users === -1 ? '∞ Ilimitado' : formData.max_users ?? 5}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Ubicaciones max.</span>
                      <span className="font-medium text-foreground">
                        {formData.max_locations === -1 ? '∞ Ilimitado' : formData.max_locations ?? 1}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Información Rápida</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Teléfono</p>
                    <p className="text-sm font-medium text-foreground">
                      {formData.phone || 'No especificado'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium text-foreground break-all">
                      {formData.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Ubicación</p>
                    <p className="text-sm font-medium text-foreground">
                      {formData.city && formData.state
                        ? `${formData.city}, ${formData.state}`
                        : formData.city || formData.state || 'No especificada'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Logo History */}
            {logoHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm">Logos Recientes</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2">
                    {logoHistory.map((url, index) => (
                      <div
                        key={index}
                        className="group relative aspect-square rounded-lg border border-border overflow-hidden bg-white"
                      >
                        <img
                          src={url}
                          alt={`Logo ${index + 1}`}
                          className="w-full h-full object-contain p-1"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleRestoreLogo(url)}
                            className="p-1.5 bg-primary rounded-full hover:bg-primary/80 transition-colors"
                            title="Restaurar"
                          >
                            <CheckCircle className="h-3 w-3 text-primary-foreground" />
                          </button>
                          <button
                            onClick={() => removeLogoFromHistory(url)}
                            className="p-1.5 bg-red-600 rounded-full hover:bg-red-500 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="h-3 w-3 text-white" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Pasa el cursor para restaurar o eliminar
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Detailed Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* General Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle>Información General</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Nombre de la Empresa *
                    </label>
                    <Input
                      value={formData.company_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData({ ...formData, company_name: e.target.value })
                      }
                      disabled={!isEditing}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Email *
                    </label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      disabled={!isEditing}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Teléfono
                    </label>
                    <Input
                      value={formData.phone}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      disabled={!isEditing}
                      placeholder="(55) 1234-5678"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Plan de Suscripción
                    </label>
                    <Input
                      value={{ freemium: 'Freemium', monthly: 'Mensual', quarterly: 'Trimestral', annual: 'Anual' }[(formData.subscription_plan || '') as string] || 'Freemium'}
                      disabled
                      className="bg-secondary/20"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <CardTitle>Dirección</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Calle
                    </label>
                    <Input
                      value={formData.street}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData({ ...formData, street: e.target.value })
                      }
                      disabled={!isEditing}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Número Exterior
                    </label>
                    <Input
                      value={formData.exterior_number}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData({ ...formData, exterior_number: e.target.value })
                      }
                      disabled={!isEditing}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Número Interior
                    </label>
                    <Input
                      value={formData.interior_number || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData({ ...formData, interior_number: e.target.value })
                      }
                      disabled={!isEditing}
                      placeholder="Opcional"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Colonia/Barrio
                    </label>
                    <Input
                      value={formData.neighborhood}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData({ ...formData, neighborhood: e.target.value })
                      }
                      disabled={!isEditing}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Código Postal
                    </label>
                    <Input
                      value={formData.postal_code}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData({ ...formData, postal_code: e.target.value })
                      }
                      disabled={!isEditing}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Ciudad
                    </label>
                    <Input
                      value={formData.city}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      disabled={!isEditing}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Estado
                    </label>
                    <Input
                      value={formData.state}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData({ ...formData, state: e.target.value })
                      }
                      disabled={!isEditing}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      País
                    </label>
                    <Input
                      value={formData.country}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData({ ...formData, country: e.target.value })
                      }
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Full Address Preview */}
            {!isEditing && (
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">
                        Dirección Completa
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formData.street} {formData.exterior_number}
                        {formData.interior_number && ` Int. ${formData.interior_number}`},{' '}
                        {formData.neighborhood}
                        <br />
                        {formData.city}, {formData.state} {formData.postal_code}
                        <br />
                        {formData.country}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
