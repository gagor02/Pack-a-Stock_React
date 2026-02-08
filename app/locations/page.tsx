'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Badge } from '@/components/ui'
import {
  MapPin,
  Plus,
  Search,
  Edit2,
  Trash2,
  Building2,
  Map,
  AlertTriangle,
  Globe,
  Navigation,
  Hash,
} from 'lucide-react'

interface LocationFormData {
  name: string
  street: string
  exterior_number: string
  interior_number: string
  neighborhood: string
  postal_code: string
  city: string
  state: string
  country: string
}

export default function LocationsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState<LocationFormData>({
    name: '',
    street: '',
    exterior_number: '',
    interior_number: '',
    neighborhood: '',
    postal_code: '',
    city: '',
    state: '',
    country: 'Mexico',
  })

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
    }
  }, [router])

  const { data: locationsResponse = [], isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await api.get('/materials/locations/')
      return response.data
    },
    retry: 1,
    staleTime: 30000,
  })

  const locations = Array.isArray(locationsResponse)
    ? locationsResponse
    : locationsResponse?.results ?? []

  const { data: accountsResponse } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const response = await api.get('/accounts/accounts/')
      return response.data
    },
  })

  const account = (() => {
    const accs = Array.isArray(accountsResponse) ? accountsResponse : accountsResponse?.results ?? []
    return accs.length > 0 ? accs[0] : null
  })()

  const maxLocations = account?.max_locations ?? 0
  const isAtLocationLimit = maxLocations !== -1 && locations.length >= maxLocations

  const stats = useMemo(() => {
    const cities = new Set(locations.map((l: any) => l.city).filter(Boolean))
    const states = new Set(locations.map((l: any) => l.state).filter(Boolean))
    return {
      total: locations.length,
      cities: cities.size,
      states: states.size,
    }
  }, [locations])

  // Filter locations
  const filteredLocations = locations.filter((location: any) =>
    location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.full_address?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const createMutation = useMutation({
    mutationFn: async (data: LocationFormData) => {
      const response = await api.post('/materials/locations/', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast.success('Ubicacion creada exitosamente')
      setShowForm(false)
      resetForm()
    },
    onError: (error: any) => {
      const data = error.response?.data
      const message = data?.message || data?.error || (typeof data === 'object' ? JSON.stringify(data) : null) || 'Error al crear ubicacion'
      toast.error(message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: LocationFormData }) => {
      const response = await api.put(`/materials/locations/${id}/`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast.success('Ubicacion actualizada exitosamente')
      setShowForm(false)
      setEditingId(null)
      resetForm()
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al actualizar ubicacion'
      toast.error(message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/materials/locations/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast.success('Ubicacion eliminada exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al eliminar ubicacion'
      toast.error(message)
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      street: '',
      exterior_number: '',
      interior_number: '',
      neighborhood: '',
      postal_code: '',
      city: '',
      state: '',
      country: 'Mexico',
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleEdit = (location: any) => {
    setEditingId(location.id)
    setFormData({
      name: location.name,
      street: location.street || '',
      exterior_number: location.exterior_number || '',
      interior_number: location.interior_number || '',
      neighborhood: location.neighborhood || '',
      postal_code: location.postal_code || '',
      city: location.city || '',
      state: location.state || '',
      country: location.country || 'Mexico',
    })
    setShowForm(true)
  }

  const handleDelete = (id: number) => {
    if (confirm('¿Estas seguro de eliminar esta ubicacion?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    resetForm()
  }

  const statCards = [
    { label: 'Total Ubicaciones', value: stats.total, icon: MapPin, color: 'text-primary', bg: 'bg-primary/20' },
    { label: 'Ciudades', value: stats.cities, icon: Building2, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    { label: 'Estados', value: stats.states, icon: Globe, color: 'text-green-400', bg: 'bg-green-500/20' },
  ]

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl border border-primary/20">
              <MapPin className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">Ubicaciones</h1>
              <p className="text-base text-muted-foreground mt-1">
                Gestiona las ubicaciones de tu inventario
              </p>
            </div>
          </div>
          {!showForm && (
            <div className="flex items-center gap-4">
              {account && maxLocations !== -1 && (
                <Badge variant={isAtLocationLimit ? 'danger' : 'secondary'} className="text-sm px-3 py-1">
                  {locations.length}/{maxLocations} ubicaciones
                </Badge>
              )}
              <Button
                onClick={() => {
                  if (isAtLocationLimit) {
                    toast.error(`Has alcanzado el limite de ${maxLocations} ubicacion(es) para tu plan`)
                    return
                  }
                  setShowForm(true)
                }}
                size="lg"
                disabled={isAtLocationLimit}
                className="text-base px-6"
              >
                <Plus className="h-5 w-5 mr-2" />
                Nueva Ubicacion
              </Button>
            </div>
          )}
        </div>

        {/* Limit Warning */}
        {isAtLocationLimit && !showForm && (
          <div className="p-4 bg-yellow-900/20 border-2 border-yellow-500/30 rounded-xl flex items-center gap-4">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <p className="text-base text-yellow-300">
              Has alcanzado el limite de {maxLocations} ubicacion(es) para tu plan <strong>{account?.subscription_plan}</strong>.
              Actualiza tu plan para agregar mas ubicaciones.
            </p>
          </div>
        )}

        {/* Stats Cards */}
        {!showForm && (
          <div className="grid grid-cols-3 gap-4">
            {statCards.map(({ label, value, icon: Icon, color, bg }) => (
              <div
                key={label}
                className="p-5 rounded-xl border-2 border-border/50 bg-card hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 text-left"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg ${bg}`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <span className={`text-3xl font-bold ${color}`}>
                    {value}
                  </span>
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  {label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        {!showForm && locations.length > 0 && (
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar ubicaciones por nombre o direccion..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border-2 border-border bg-card px-5 py-3.5 pl-12 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
            />
          </div>
        )}

        {showForm ? (
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-primary/10 rounded-lg">
                  {editingId ? <Edit2 className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
                </div>
                {editingId ? 'Editar Ubicacion' : 'Nueva Ubicacion'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 uppercase tracking-wider">
                    Nombre de la Ubicacion *
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Ej: Almacen Principal, Bodega Norte"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2 uppercase tracking-wider">
                      Calle *
                    </label>
                    <Input
                      type="text"
                      value={formData.street}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, street: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2 uppercase tracking-wider">
                      Numero Exterior *
                    </label>
                    <Input
                      type="text"
                      value={formData.exterior_number}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, exterior_number: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2 uppercase tracking-wider">
                      Numero Interior
                    </label>
                    <Input
                      type="text"
                      value={formData.interior_number}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, interior_number: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2 uppercase tracking-wider">
                      Colonia/Barrio *
                    </label>
                    <Input
                      type="text"
                      value={formData.neighborhood}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, neighborhood: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2 uppercase tracking-wider">
                      Codigo Postal *
                    </label>
                    <Input
                      type="text"
                      value={formData.postal_code}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, postal_code: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2 uppercase tracking-wider">
                      Ciudad *
                    </label>
                    <Input
                      type="text"
                      value={formData.city}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, city: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2 uppercase tracking-wider">
                      Estado *
                    </label>
                    <Input
                      type="text"
                      value={formData.state}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, state: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2 uppercase tracking-wider">
                      Pais *
                    </label>
                    <Input
                      type="text"
                      value={formData.country}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, country: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    size="lg"
                    className="text-base px-8"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? 'Guardando...'
                      : editingId
                      ? 'Actualizar Ubicacion'
                      : 'Crear Ubicacion'}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCancel}
                    variant="secondary"
                    size="lg"
                    className="text-base px-6"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-primary mb-4"></div>
            <p className="text-base text-muted-foreground">Cargando ubicaciones...</p>
          </div>
        ) : filteredLocations.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="p-16 text-center">
              <div className="p-4 bg-secondary/30 rounded-2xl w-fit mx-auto mb-6">
                <Building2 className="h-14 w-14 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                {locations.length === 0 ? 'No hay ubicaciones' : 'No se encontraron resultados'}
              </h3>
              <p className="text-base text-muted-foreground mb-6 max-w-sm mx-auto">
                {locations.length === 0
                  ? 'Crea al menos una ubicacion para poder agregar materiales.'
                  : 'Intenta con otros terminos de busqueda.'}
              </p>
              {locations.length === 0 && (
                <Button onClick={() => setShowForm(true)} size="lg" className="text-base px-6">
                  <Plus className="h-5 w-5 mr-2" />
                  Agregar Ubicacion
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {filteredLocations.map((location: any) => (
              <Card
                key={location.id}
                className="border-l-4 border-l-primary hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                <CardContent className="p-0">
                  <div className="flex flex-col gap-4 p-5">
                    {/* Location Info */}
                    <div className="flex-1 min-w-0">
                      {/* Name */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 rounded-xl bg-primary/10">
                          <Map className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">
                          {location.name}
                        </h3>
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Navigation className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Direccion</p>
                            <p className="text-sm font-medium text-foreground truncate">{location.full_address || `${location.street} ${location.exterior_number}`}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                          <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Building2 className="h-4 w-4 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Ciudad / Estado</p>
                            <p className="text-sm font-medium text-foreground">{location.city}, {location.state}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                          <div className="p-2 bg-green-500/10 rounded-lg">
                            <Hash className="h-4 w-4 text-green-400" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Codigo Postal</p>
                            <p className="text-sm font-medium text-foreground">{location.postal_code}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3 w-full pt-2 border-t border-border/30 mt-2">
                      <Button
                        onClick={() => handleEdit(location)}
                        variant="secondary"
                        size="lg"
                        className="w-full text-base py-3"
                      >
                        <Edit2 className="h-5 w-5 mr-2" />
                        Editar
                      </Button>
                      <Button
                        onClick={() => handleDelete(location.id)}
                        variant="destructive"
                        size="lg"
                        className="w-full text-base py-3"
                      >
                        <Trash2 className="h-5 w-5 mr-2" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
