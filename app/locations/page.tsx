'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import {
  MapPin,
  Plus,
  Search,
  Edit2,
  Trash2,
  Building2,
  Map,
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
      toast.success('Ubicación creada exitosamente')
      setShowForm(false)
      resetForm()
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al crear ubicación'
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
      toast.success('Ubicación actualizada exitosamente')
      setShowForm(false)
      setEditingId(null)
      resetForm()
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al actualizar ubicación'
      toast.error(message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/materials/locations/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast.success('Ubicación eliminada exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al eliminar ubicación'
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
    if (confirm('¿Estás seguro de eliminar esta ubicación?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    resetForm()
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Ubicaciones</h1>
              <p className="text-sm text-muted-foreground">
                Gestiona las ubicaciones de tu inventario
              </p>
            </div>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)} size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Nueva Ubicación
            </Button>
          )}
        </div>

        {/* Search */}
        {!showForm && locations.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar ubicaciones..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {showForm ? (
          <Card>
            <CardHeader>
              <CardTitle>
                {editingId ? 'Editar Ubicación' : 'Nueva Ubicación'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Nombre de la Ubicación *
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Ej: Almacén Principal, Bodega Norte"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
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
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Número Exterior *
                    </label>
                    <Input
                      type="text"
                      value={formData.exterior_number}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, exterior_number: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Número Interior
                    </label>
                    <Input
                      type="text"
                      value={formData.interior_number}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, interior_number: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
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
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Código Postal *
                    </label>
                    <Input
                      type="text"
                      value={formData.postal_code}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, postal_code: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
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
                    <label className="block text-sm font-medium text-foreground mb-2">
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
                    <label className="block text-sm font-medium text-foreground mb-2">
                      País *
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
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? 'Guardando...'
                      : editingId
                      ? 'Actualizar Ubicación'
                      : 'Crear Ubicación'}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCancel}
                    variant="secondary"
                    size="lg"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredLocations.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {locations.length === 0 ? 'No hay ubicaciones' : 'No se encontraron resultados'}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {locations.length === 0
                  ? 'Crea al menos una ubicación para poder agregar materiales.'
                  : 'Intenta con otros términos de búsqueda.'}
              </p>
              {locations.length === 0 && (
                <Button onClick={() => setShowForm(true)} size="lg">
                  <Plus className="h-5 w-5 mr-2" />
                  Agregar Ubicación
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLocations.map((location: any) => (
              <Card key={location.id} className="group hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  {/* Icon */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Map className="h-6 w-6 text-primary" />
                    </div>
                  </div>

                  {/* Location Name */}
                  <h3 className="font-semibold text-foreground text-lg mb-1">
                    {location.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {location.full_address}
                  </p>

                  {/* Details */}
                  <div className="space-y-2 mb-4">
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Ciudad:</span> {location.city}, {location.state}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">CP:</span> {location.postal_code}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => handleEdit(location)}
                      variant="secondary"
                      size="sm"
                      className="w-full"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      onClick={() => handleDelete(location.id)}
                      variant="destructive"
                      size="sm"
                      className="w-full"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </Button>
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
