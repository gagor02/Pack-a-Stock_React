'use client'

import { useState, useEffect, useRef } from 'react'
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
  Package,
  Plus,
  Search,
  MapPin,
  Hash,
  Edit2,
  Trash2,
  PackageOpen,
  Image as ImageIcon,
  Eye,
  QrCode,
  Camera,
  X,
} from 'lucide-react'
import jsQR from 'jsqr'

interface Category {
  id: number
  name: string
  is_consumable: boolean
}

interface Location {
  id: number
  name: string
  full_address: string
}

interface MaterialFormData {
  name: string
  description: string
  category: number | string
  location: number | string
  sku: string
  serial_number: string
  quantity: number
  min_stock_level: number
  unit_of_measure: string
  status: string
  is_available_for_loan: boolean
}

export default function MaterialsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterLocation, setFilterLocation] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [viewingMaterial, setViewingMaterial] = useState<any | null>(null)

  // QR Scanner state
  const [isScanning, setIsScanning] = useState(false)
  const [scannedMaterial, setScannedMaterial] = useState<any | null>(null)
  const [addStockQuantity, setAddStockQuantity] = useState(1)
  const [showAddStock, setShowAddStock] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isScanningRef = useRef(false)
  const streamRef = useRef<MediaStream | null>(null)

  const [formData, setFormData] = useState<MaterialFormData>({
    name: '',
    description: '',
    category: '',
    location: '',
    sku: '',
    serial_number: '',
    quantity: 1,
    min_stock_level: 1,
    unit_of_measure: 'unit',
    status: 'available',
    is_available_for_loan: true,
  })

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
    }
  }, [router])

  const { data: materialsResponse = [], isLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: async () => {
      const response = await api.get('/materials/materials/')
      return response.data
    },
  })

  const materials = Array.isArray(materialsResponse)
    ? materialsResponse
    : materialsResponse?.results ?? []

  const { data: categoriesResponse = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/materials/categories/')
      return response.data
    },
  })

  const categories = Array.isArray(categoriesResponse)
    ? categoriesResponse
    : categoriesResponse?.results ?? []

  const { data: locationsResponse = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await api.get('/materials/locations/')
      return response.data
    },
  })

  const locations = Array.isArray(locationsResponse)
    ? locationsResponse
    : locationsResponse?.results ?? []

  const createMutation = useMutation({
    mutationFn: async (data: MaterialFormData) => {
      const formDataToSend = new FormData()

      // Add all form fields
      Object.entries(data).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          formDataToSend.append(key, value.toString())
        }
      })

      // Add image if selected
      if (selectedImage) {
        formDataToSend.append('image', selectedImage)
      }

      const response = await api.post('/materials/materials/', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      toast.success('Material creado exitosamente')
      setShowForm(false)
      resetForm()
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al crear material'
      toast.error(message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: MaterialFormData }) => {
      const response = await api.put(`/materials/materials/${id}/`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      toast.success('Material actualizado exitosamente')
      setShowForm(false)
      setEditingId(null)
      resetForm()
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al actualizar material'
      toast.error(message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/materials/materials/${id}/`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      toast.success('Material eliminado exitosamente')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Error al eliminar material'
      toast.error(message)
    },
  })

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      location: '',
      sku: '',
      serial_number: '',
      quantity: 1,
      min_stock_level: 1,
      unit_of_measure: 'unit',
      status: 'available',
      is_available_for_loan: true,
    })
    setSelectedImage(null)
    setImagePreview(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleEdit = (material: any) => {
    setEditingId(material.id)
    setFormData({
      name: material.name,
      description: material.description || '',
      category: material.category?.id || material.category || '',
      location: material.location?.id || material.location || '',
      sku: material.sku || '',
      serial_number: material.serial_number || '',
      quantity: material.quantity || 1,
      min_stock_level: material.min_stock_level || 1,
      unit_of_measure: material.unit_of_measure || 'unit',
      status: material.status || 'available',
      is_available_for_loan: material.is_available_for_loan !== undefined ? material.is_available_for_loan : true,
    })
    setShowForm(true)
  }

  const handleDelete = (id: number) => {
    if (confirm('¿Estás seguro de eliminar este material?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    resetForm()
  }

  // --- QR Scanner functions ---
  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      streamRef.current = stream
      isScanningRef.current = true
      setIsScanning(true)
    } catch (error) {
      console.error('Error accessing camera:', error)
      toast.error('No se pudo acceder a la cámara')
    }
  }

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    isScanningRef.current = false
    setIsScanning(false)
  }

  useEffect(() => {
    if (isScanning && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().then(() => {
        requestAnimationFrame(scanQRCode)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScanning])

  const scanQRCode = () => {
    if (!isScanningRef.current || !videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    if (!context) return

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)

      if (code) {
        handleQRCodeScanned(code.data)
        return
      }
    }

    requestAnimationFrame(scanQRCode)
  }

  const handleQRCodeScanned = async (qrCode: string) => {
    try {
      stopScanning()
      const response = await api.get('/materials/materials/search_by_qr/', {
        params: { qr_code: qrCode }
      })
      setScannedMaterial(response.data)
      toast.success(`Material encontrado: ${response.data.name}`)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Material no encontrado')
    }
  }

  const handleAddStock = async () => {
    if (!scannedMaterial) return

    try {
      await api.post(`/materials/materials/${scannedMaterial.id}/add_stock/`, {
        quantity: addStockQuantity
      })
      toast.success(`${addStockQuantity} unidades agregadas al stock`)
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      setShowAddStock(false)
      setScannedMaterial(null)
      setAddStockQuantity(1)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al agregar stock')
    }
  }

  // Check if selected category is consumable (for serial number field visibility)
  const selectedCategoryIsConsumable = (() => {
    if (!formData.category) return false
    const cat = categories.find((c: Category) => c.id === Number(formData.category))
    return cat?.is_consumable || false
  })()

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Materiales</h1>
              <p className="text-sm text-muted-foreground">
                Gestión de inventario y stock
              </p>
            </div>
          </div>
          {!showForm && (
            <div className="flex gap-3">
              <Button onClick={startScanning} variant="secondary" size="lg">
                <Camera className="h-5 w-5 mr-2" />
                Escanear QR
              </Button>
              <Button onClick={() => setShowForm(true)} size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Nuevo Material
              </Button>
            </div>
          )}
        </div>
        {showForm ? (
          <Card>
            <CardHeader>
              <CardTitle>
                {editingId ? 'Editar Material' : 'Nuevo Material'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Nombre *
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Ej: Laptop Dell XPS 15"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Categoría *
                  </label>
                  <Input
                    as="select"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                  >
                    <option value="">Seleccionar categoría</option>
                    {categories.map((cat: Category) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </Input>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Ubicación *
                  </label>
                  <Input
                    as="select"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                  >
                    <option value="">Seleccionar ubicación</option>
                    {locations.map((loc: Location) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </Input>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    SKU (opcional)
                  </label>
                  <Input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Se genera automáticamente"
                  />
                </div>

                {/* Serial Number - Solo para no consumibles */}
                {!selectedCategoryIsConsumable && formData.category && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Numero de Serie (opcional)
                    </label>
                    <Input
                      type="text"
                      value={formData.serial_number}
                      onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                      placeholder="Ej: SN-12345-ABC"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Cantidad *
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Stock Mínimo *
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.min_stock_level}
                    onChange={(e) => setFormData({ ...formData, min_stock_level: parseInt(e.target.value) })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Unidad de Medida *
                  </label>
                  <Input
                    as="select"
                    value={formData.unit_of_measure}
                    onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
                    required
                  >
                    <option value="unit">Unidad</option>
                    <option value="set">Conjunto</option>
                    <option value="box">Caja</option>
                    <option value="package">Paquete</option>
                    <option value="meter">Metro</option>
                    <option value="kg">Kilogramo</option>
                    <option value="liter">Litro</option>
                  </Input>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Estado *
                  </label>
                  <Input
                    as="select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    required
                  >
                    <option value="available">Disponible</option>
                    <option value="in_use">En uso</option>
                    <option value="maintenance">Mantenimiento</option>
                  </Input>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Descripción
                </label>
                <Input
                  as="textarea"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Descripción detallada del material..."
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <ImageIcon className="h-4 w-4 inline mr-2" />
                  Imagen del Material (opcional)
                </label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
                {imagePreview && (
                  <div className="mt-4 relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full max-w-xs rounded-lg border border-border"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedImage(null)
                        setImagePreview(null)
                      }}
                      className="mt-2"
                    >
                      Remover imagen
                    </Button>
                  </div>
                )}
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
                    ? 'Actualizar Material'
                    : 'Crear Material'}
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
        ) : materials.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <PackageOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No hay materiales
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Comienza agregando un nuevo material a tu inventario.
              </p>
              <Button onClick={() => setShowForm(true)} size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Agregar Material
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {materials.map((material: any) => (
              <Card key={material.id} className="group overflow-hidden hover:shadow-xl transition-all duration-300">
                <CardContent className="p-0">
                  {/* Product Image */}
                  <div className="relative aspect-square bg-secondary/20 overflow-hidden">
                    {material.image ? (
                      <img
                        src={material.image}
                        alt={material.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary/30 to-secondary/10">
                        <Package className="h-20 w-20 text-muted-foreground/30" />
                      </div>
                    )}

                    {/* QR Code Button - Top Left */}
                    {material.qr_image && (
                      <button
                        onClick={() => setViewingMaterial(material)}
                        className="absolute top-3 left-3 p-2 bg-background/90 backdrop-blur-sm rounded-lg shadow-lg hover:bg-primary hover:text-primary-foreground transition-all duration-200 opacity-0 group-hover:opacity-100"
                        title="Ver código QR"
                      >
                        <QrCode className="h-5 w-5" />
                      </button>
                    )}

                    {/* Status Badge - Top Right */}
                    <div className="absolute top-3 right-3">
                      <Badge
                        variant={
                          material.status === 'available'
                            ? 'success'
                            : material.status === 'in_use'
                            ? 'warning'
                            : 'default'
                        }
                        className="shadow-lg"
                      >
                        {material.status === 'available'
                          ? 'Disponible'
                          : material.status === 'in_use'
                          ? 'En uso'
                          : 'Mantenimiento'}
                      </Badge>
                    </div>

                    {/* Stock Badge - Bottom Right */}
                    {material.is_low_stock && (
                      <div className="absolute bottom-3 right-3">
                        <Badge variant="default" className="bg-destructive/90 backdrop-blur-sm shadow-lg">
                          Stock Bajo
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-4 space-y-3">
                    {/* Title & Category */}
                    <div>
                      <h3 className="font-semibold text-foreground text-lg mb-1 line-clamp-1">
                        {material.name}
                      </h3>
                      <p className="text-sm text-primary font-medium">
                        {material.category?.name}
                      </p>
                    </div>

                    {/* Details */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{material.location?.name || 'Sin ubicación'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Hash className="h-4 w-4 flex-shrink-0" />
                        <span>
                          {material.quantity} {material.unit_of_measure || 'unidades'}
                        </span>
                      </div>
                      {material.sku && (
                        <div className="text-xs text-muted-foreground font-mono bg-secondary/30 px-2 py-1 rounded">
                          SKU: {material.sku}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <Button
                        onClick={() => setViewingMaterial(material)}
                        variant="default"
                        size="sm"
                        className="w-full"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleEdit(material)}
                        variant="secondary"
                        size="sm"
                        className="w-full"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(material.id)}
                        variant="danger"
                        size="sm"
                        className="w-full"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Material Detail Modal */}
        {viewingMaterial && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">
                      {viewingMaterial.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {viewingMaterial.category?.name}
                    </p>
                  </div>
                  <Badge
                    variant={
                      viewingMaterial.status === 'available'
                        ? 'success'
                        : viewingMaterial.status === 'in_use'
                        ? 'warning'
                        : 'default'
                    }
                  >
                    {viewingMaterial.status === 'available'
                      ? 'Disponible'
                      : viewingMaterial.status === 'in_use'
                      ? 'En uso'
                      : 'Mantenimiento'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Image and QR Code */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Material Image */}
                  {viewingMaterial.image && (
                    <div>
                      <h3 className="text-sm font-medium text-foreground mb-2">
                        Imagen
                      </h3>
                      <img
                        src={viewingMaterial.image}
                        alt={viewingMaterial.name}
                        className="w-full rounded-lg border border-border"
                      />
                    </div>
                  )}

                  {/* QR Code */}
                  {viewingMaterial.qr_image && (
                    <div>
                      <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                        <QrCode className="h-4 w-4" />
                        Código QR
                      </h3>
                      <div className="bg-white p-4 rounded-lg inline-block">
                        <img
                          src={viewingMaterial.qr_image}
                          alt="QR Code"
                          className="w-48 h-48"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 font-mono">
                        {viewingMaterial.qr_code}
                      </p>
                    </div>
                  )}
                </div>

                {/* Material Information */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs text-muted-foreground mb-1">
                      SKU
                    </h4>
                    <p className="text-sm font-medium font-mono">
                      {viewingMaterial.sku || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs text-muted-foreground mb-1">
                      Ubicación
                    </h4>
                    <p className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {viewingMaterial.location?.name || 'Sin ubicación'}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs text-muted-foreground mb-1">
                      Cantidad
                    </h4>
                    <p className="text-sm font-medium">
                      {viewingMaterial.quantity} {viewingMaterial.unit_of_measure || 'unidades'}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs text-muted-foreground mb-1">
                      Stock Mínimo
                    </h4>
                    <p className="text-sm font-medium">
                      {viewingMaterial.min_stock_level}
                    </p>
                  </div>
                </div>

                {/* Description */}
                {viewingMaterial.description && (
                  <div>
                    <h4 className="text-xs text-muted-foreground mb-2">
                      Descripción
                    </h4>
                    <p className="text-sm text-foreground">
                      {viewingMaterial.description}
                    </p>
                  </div>
                )}

                {/* Close Button */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="secondary"
                    onClick={() => setViewingMaterial(null)}
                  >
                    Cerrar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        {/* QR Scanner Modal */}
        {isScanning && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5 text-purple-400" />
                    Escanear Material
                  </CardTitle>
                  <button onClick={stopScanning} className="text-muted-foreground hover:text-foreground">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                  />
                  <div className="absolute inset-0 border-4 border-purple-500/50 rounded-lg">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-purple-400 rounded-lg animate-pulse" />
                  </div>
                </div>
                <canvas ref={canvasRef} className="hidden" />
                <p className="text-sm text-muted-foreground text-center">
                  Apunta la camara al codigo QR del material
                </p>
                <Button onClick={stopScanning} variant="secondary" className="w-full">
                  Cancelar
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Scanned Material Info Modal */}
        {scannedMaterial && !showAddStock && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{scannedMaterial.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {scannedMaterial.category_detail?.name || scannedMaterial.category_name}
                    </p>
                  </div>
                  <button onClick={() => setScannedMaterial(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Image & QR */}
                <div className="grid md:grid-cols-2 gap-4">
                  {scannedMaterial.image && (
                    <div>
                      <h4 className="text-xs text-muted-foreground mb-2">Imagen</h4>
                      <img src={scannedMaterial.image} alt={scannedMaterial.name} className="w-full rounded-lg border border-border" />
                    </div>
                  )}
                  {scannedMaterial.qr_image && (
                    <div>
                      <h4 className="text-xs text-muted-foreground mb-2">Codigo QR</h4>
                      <div className="bg-white p-4 rounded-lg inline-block">
                        <img src={scannedMaterial.qr_image} alt="QR" className="w-32 h-32" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">{scannedMaterial.qr_code}</p>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs text-muted-foreground mb-1">SKU</h4>
                    <p className="text-sm font-medium font-mono">{scannedMaterial.sku}</p>
                  </div>
                  {scannedMaterial.serial_number && (
                    <div>
                      <h4 className="text-xs text-muted-foreground mb-1">Numero de Serie</h4>
                      <p className="text-sm font-medium font-mono">{scannedMaterial.serial_number}</p>
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs text-muted-foreground mb-1">Ubicacion</h4>
                    <p className="text-sm font-medium">{scannedMaterial.location_detail?.name || scannedMaterial.location_name || 'Sin ubicacion'}</p>
                  </div>
                  <div>
                    <h4 className="text-xs text-muted-foreground mb-1">Cantidad Total</h4>
                    <p className="text-sm font-medium">{scannedMaterial.quantity} {scannedMaterial.unit_of_measure}</p>
                  </div>
                  <div>
                    <h4 className="text-xs text-muted-foreground mb-1">Disponible</h4>
                    <p className="text-sm font-medium">{scannedMaterial.available_quantity} {scannedMaterial.unit_of_measure}</p>
                  </div>
                  <div>
                    <h4 className="text-xs text-muted-foreground mb-1">Estado</h4>
                    <Badge variant={scannedMaterial.status === 'available' ? 'success' : 'warning'}>
                      {scannedMaterial.status === 'available' ? 'Disponible' : scannedMaterial.status}
                    </Badge>
                  </div>
                </div>

                {scannedMaterial.description && (
                  <div>
                    <h4 className="text-xs text-muted-foreground mb-1">Descripcion</h4>
                    <p className="text-sm">{scannedMaterial.description}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  {(scannedMaterial.category_detail?.is_consumable || scannedMaterial.is_consumable) && (
                    <Button onClick={() => setShowAddStock(true)} className="flex-1">
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Stock
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => setScannedMaterial(null)} className="flex-1">
                    Cerrar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add Stock Modal */}
        {showAddStock && scannedMaterial && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Agregar Stock</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg">
                  <p className="text-sm font-medium text-foreground">{scannedMaterial.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Stock actual: {scannedMaterial.quantity} {scannedMaterial.unit_of_measure}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Cantidad a agregar
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={addStockQuantity}
                    onChange={(e) => setAddStockQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleAddStock} className="flex-1">
                    Agregar
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowAddStock(false)
                      setAddStockQuantity(1)
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
