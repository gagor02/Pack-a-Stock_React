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
  History,
  Clock,
  User,
  ArrowRight,
  BarChart3,
  Tag,
  Layers,
  ChevronDown,
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

interface LoanHistoryItem {
  borrower: {
    id: number
    full_name: string
    email: string
  }
  quantity_loaned: number
  issued_at: string
  expected_return_date: string
  actual_return_date: string | null
  status: string
  condition_on_pickup: string
  condition_on_return: string | null
  duration_days: number
}

interface MaterialHistory {
  material_name: string
  total_loans: number
  active_loans: number
  top_borrower: string | null
  history: LoanHistoryItem[]
}

export default function MaterialsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [filterLocation, setFilterLocation] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [viewingMaterial, setViewingMaterial] = useState<any | null>(null)
  const [historyMaterial, setHistoryMaterial] = useState<any | null>(null)

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

  // History query
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['material-history', historyMaterial?.id],
    queryFn: async () => {
      const response = await api.get(`/materials/materials/${historyMaterial.id}/history/`)
      return (response.data?.data || response.data) as MaterialHistory
    },
    enabled: !!historyMaterial,
  })

  // Category counts
  const categoryCounts = materials.reduce((acc: Record<string, number>, m: any) => {
    const catName = m.category?.name || m.category_name || 'Sin categoría'
    acc[catName] = (acc[catName] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Filtered materials
  const filteredMaterials = materials.filter((m: any) => {
    const matchesSearch = !searchTerm ||
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.serial_number?.toLowerCase().includes(searchTerm.toLowerCase())

    const catName = m.category?.name || m.category_name || 'Sin categoría'
    const matchesCategory = filterCategory === 'all' || catName === filterCategory

    return matchesSearch && matchesCategory
  })

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

  const translateUnit = (unit: string) => {
    const map: Record<string, string> = {
      unit: 'unidades', set: 'conjuntos', box: 'cajas',
      package: 'paquetes', meter: 'metros', kg: 'kg', liter: 'litros',
    }
    return map[unit] || unit
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'border-emerald-500'
      case 'in_use': return 'border-amber-500'
      case 'on_loan': return 'border-blue-500'
      case 'maintenance': return 'border-red-500'
      default: return 'border-border'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return 'Disponible'
      case 'in_use': return 'En uso'
      case 'on_loan': return 'En préstamo'
      case 'maintenance': return 'Mantenimiento'
      default: return status
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl border border-primary/20">
              <Package className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Materiales</h1>
              <p className="text-sm text-muted-foreground">
                {materials.length} materiales en inventario
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
          <Card className="border-2 shadow-2xl">
            <CardHeader>
              <CardTitle>
                {editingId ? 'Editar Material' : 'Nuevo Material'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    Nombre *
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Ej: Laptop Dell XPS 15"
                    className="rounded-xl border-2 text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    Categoría *
                  </label>
                  <Input
                    as="select"
                    value={formData.category}
                    onChange={(e: any) => setFormData({ ...formData, category: e.target.value })}
                    required
                    className="rounded-xl border-2 text-base"
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
                  <label className="block text-sm font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    Ubicación *
                  </label>
                  <Input
                    as="select"
                    value={formData.location}
                    onChange={(e: any) => setFormData({ ...formData, location: e.target.value })}
                    required
                    className="rounded-xl border-2 text-base"
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
                  <label className="block text-sm font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    SKU (opcional)
                  </label>
                  <Input
                    type="text"
                    value={formData.sku}
                    onChange={(e: any) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Se genera automáticamente"
                    className="rounded-xl border-2 text-base"
                  />
                </div>

                {/* Serial Number - Solo para no consumibles */}
                {!selectedCategoryIsConsumable && formData.category && (
                  <div>
                    <label className="block text-sm font-medium uppercase tracking-wider text-muted-foreground mb-2">
                      Numero de Serie (opcional)
                    </label>
                    <Input
                      type="text"
                      value={formData.serial_number}
                      onChange={(e: any) => setFormData({ ...formData, serial_number: e.target.value })}
                      placeholder="Ej: SN-12345-ABC"
                      className="rounded-xl border-2 text-base"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    Cantidad *
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e: any) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                    required
                    className="rounded-xl border-2 text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    Stock Mínimo *
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.min_stock_level}
                    onChange={(e: any) => setFormData({ ...formData, min_stock_level: parseInt(e.target.value) })}
                    required
                    className="rounded-xl border-2 text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    Unidad de Medida *
                  </label>
                  <Input
                    as="select"
                    value={formData.unit_of_measure}
                    onChange={(e: any) => setFormData({ ...formData, unit_of_measure: e.target.value })}
                    required
                    className="rounded-xl border-2 text-base"
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
                  <label className="block text-sm font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    Estado *
                  </label>
                  <Input
                    as="select"
                    value={formData.status}
                    onChange={(e: any) => setFormData({ ...formData, status: e.target.value })}
                    required
                    className="rounded-xl border-2 text-base"
                  >
                    <option value="available">Disponible</option>
                    <option value="in_use">En uso</option>
                    <option value="maintenance">Mantenimiento</option>
                  </Input>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  Descripción
                </label>
                <Input
                  as="textarea"
                  value={formData.description}
                  onChange={(e: any) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Descripción detallada del material..."
                  className="rounded-xl border-2 text-base"
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium uppercase tracking-wider text-muted-foreground mb-2">
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
          <Card className="border-dashed border-2">
            <CardContent className="p-12 text-center">
              <PackageOpen className="mx-auto h-14 w-14 text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium text-foreground mb-2">
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
          <>
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por nombre, SKU o número de serie..."
                value={searchTerm}
                onChange={(e: any) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border-2 border-border bg-card px-5 py-3.5 pl-12 text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            {/* Category Filter */}
            {(() => {
              const categoryEntries = Object.entries(categoryCounts)
              const MAX_VISIBLE = 4
              const hasOverflow = categoryEntries.length > MAX_VISIBLE
              const visibleCategories = hasOverflow ? categoryEntries.slice(0, MAX_VISIBLE) : categoryEntries
              const hiddenCategories = hasOverflow ? categoryEntries.slice(MAX_VISIBLE) : []
              const selectedHiddenCat = hiddenCategories.find(([name]) => name === filterCategory)

              return (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setFilterCategory('all')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                      filterCategory === 'all'
                        ? 'bg-primary text-primary-foreground shadow-lg'
                        : 'bg-secondary/30 text-muted-foreground hover:bg-secondary/50'
                    }`}
                  >
                    <Layers className="h-4 w-4" />
                    Todos
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                      filterCategory === 'all' ? 'bg-primary-foreground/20' : 'bg-secondary/50'
                    }`}>
                      {materials.length}
                    </span>
                  </button>
                  {visibleCategories.map(([catName, count]) => (
                    <button
                      key={catName}
                      onClick={() => setFilterCategory(catName)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                        filterCategory === catName
                          ? 'bg-primary text-primary-foreground shadow-lg'
                          : 'bg-secondary/30 text-muted-foreground hover:bg-secondary/50'
                      }`}
                    >
                      <Tag className="h-4 w-4" />
                      {catName}
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                        filterCategory === catName ? 'bg-primary-foreground/20' : 'bg-secondary/50'
                      }`}>
                        {count as number}
                      </span>
                    </button>
                  ))}
                  {hasOverflow && (
                    <div className="relative">
                      <button
                        onClick={() => setShowAllCategories(!showAllCategories)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                          selectedHiddenCat
                            ? 'bg-primary text-primary-foreground shadow-lg'
                            : 'bg-secondary/30 text-muted-foreground hover:bg-secondary/50'
                        }`}
                      >
                        {selectedHiddenCat ? (
                          <>
                            <Tag className="h-4 w-4" />
                            {selectedHiddenCat[0]}
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-bold bg-primary-foreground/20`}>
                              {selectedHiddenCat[1] as number}
                            </span>
                          </>
                        ) : (
                          <>
                            +{hiddenCategories.length} más
                          </>
                        )}
                        <ChevronDown className={`h-4 w-4 transition-transform ${showAllCategories ? 'rotate-180' : ''}`} />
                      </button>
                      {showAllCategories && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowAllCategories(false)} />
                          <div className="absolute top-full left-0 mt-2 z-50 bg-card border-2 border-border rounded-xl shadow-2xl p-2 min-w-[220px] max-h-[300px] overflow-y-auto">
                            {hiddenCategories.map(([catName, count]) => (
                              <button
                                key={catName}
                                onClick={() => {
                                  setFilterCategory(catName)
                                  setShowAllCategories(false)
                                }}
                                className={`flex items-center justify-between gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                  filterCategory === catName
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-foreground hover:bg-secondary/50'
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <Tag className="h-4 w-4" />
                                  {catName}
                                </span>
                                <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                                  filterCategory === catName ? 'bg-primary-foreground/20' : 'bg-secondary/50'
                                }`}>
                                  {count as number}
                                </span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Materials Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredMaterials.map((material: any) => (
                <Card
                  key={material.id}
                  className={`group overflow-hidden hover:shadow-xl transition-all duration-300 border-l-4 ${getStatusColor(material.status)}`}
                >
                  <CardContent className="p-0">
                    {/* Product Image */}
                    <div className="relative aspect-[4/3] bg-secondary/20 overflow-hidden">
                      {material.image ? (
                        <img
                          src={material.image}
                          alt={material.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary/30 to-secondary/10">
                          <Package className="h-16 w-16 text-muted-foreground/30" />
                        </div>
                      )}

                      {/* QR Code Mini - Top Left */}
                      {material.qr_image && (
                        <div className="absolute top-2 left-2 p-1.5 bg-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200">
                          <img
                            src={material.qr_image}
                            alt="QR"
                            className="w-10 h-10"
                          />
                        </div>
                      )}

                      {/* Status Badge - Top Right */}
                      <div className="absolute top-2 right-2">
                        <Badge
                          variant={
                            material.status === 'available'
                              ? 'success'
                              : material.status === 'on_loan'
                              ? 'info'
                              : material.status === 'in_use'
                              ? 'warning'
                              : 'default'
                          }
                          className="shadow-lg text-xs"
                        >
                          {getStatusLabel(material.status)}
                        </Badge>
                      </div>

                      {/* Stock Badge - Bottom Right (solo consumibles) */}
                      {material.is_low_stock && (material.category?.is_consumable || material.is_consumable) && (
                        <div className="absolute bottom-2 right-2">
                          <Badge variant="default" className="bg-destructive/90 backdrop-blur-sm shadow-lg text-xs">
                            Stock Bajo
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-4 space-y-3">
                      {/* Title & Category */}
                      <div>
                        <h3 className="font-semibold text-foreground text-base mb-1 line-clamp-1">
                          {material.name}
                        </h3>
                        <p className="text-xs text-primary font-medium uppercase tracking-wider">
                          {material.category?.name || material.category_name}
                        </p>
                      </div>

                      {/* Key Info Blocks */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-secondary/20 rounded-lg px-2.5 py-1.5">
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Ubicación</p>
                          <p className="text-xs font-medium text-foreground truncate flex items-center gap-1">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            {material.location?.name || material.location_name || 'N/A'}
                          </p>
                        </div>
                        <div className="bg-secondary/20 rounded-lg px-2.5 py-1.5">
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Stock</p>
                          <p className="text-xs font-medium text-foreground flex items-center gap-1">
                            <Hash className="h-3 w-3 flex-shrink-0" />
                            {material.quantity} {translateUnit(material.unit_of_measure || 'unit')}
                          </p>
                        </div>
                      </div>

                      {/* Serial / SKU Row */}
                      {(material.serial_number || material.sku) && (
                        <div className="flex flex-wrap gap-1.5">
                          {material.serial_number && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                              SN: {material.serial_number}
                            </span>
                          )}
                          {material.sku && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-secondary/40 text-muted-foreground px-2 py-0.5 rounded-md">
                              SKU: {material.sku}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="grid grid-cols-4 gap-1.5 pt-1">
                        <Button
                          onClick={() => setViewingMaterial(material)}
                          variant="secondary"
                          size="sm"
                          className="w-full"
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => setHistoryMaterial(material)}
                          variant="secondary"
                          size="sm"
                          className="w-full"
                          title="Historial de préstamos"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleEdit(material)}
                          variant="secondary"
                          size="sm"
                          className="w-full"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(material.id)}
                          variant="destructive"
                          size="sm"
                          className="w-full"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* No results after filter */}
            {filteredMaterials.length === 0 && materials.length > 0 && (
              <Card className="border-dashed border-2">
                <CardContent className="p-12 text-center">
                  <Search className="mx-auto h-14 w-14 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium text-foreground mb-2">
                    Sin resultados
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    No se encontraron materiales con los filtros aplicados.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Material Detail Modal */}
        {viewingMaterial && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border-2 shadow-2xl">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">
                      {viewingMaterial.name}
                    </CardTitle>
                    <p className="text-sm text-primary font-medium mt-1">
                      {viewingMaterial.category?.name || viewingMaterial.category_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        viewingMaterial.status === 'available'
                          ? 'success'
                          : viewingMaterial.status === 'in_use'
                          ? 'warning'
                          : 'default'
                      }
                    >
                      {getStatusLabel(viewingMaterial.status)}
                    </Badge>
                    <button onClick={() => setViewingMaterial(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Image and QR Code */}
                <div className="grid md:grid-cols-2 gap-6">
                  {viewingMaterial.image && (
                    <div>
                      <h3 className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">
                        Imagen
                      </h3>
                      <img
                        src={viewingMaterial.image}
                        alt={viewingMaterial.name}
                        className="w-full rounded-xl border-2 border-border"
                      />
                    </div>
                  )}

                  {viewingMaterial.qr_image && (
                    <div>
                      <h3 className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2 flex items-center gap-2">
                        <QrCode className="h-4 w-4" />
                        Código QR
                      </h3>
                      <div className="bg-white p-4 rounded-xl inline-block">
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-secondary/20 rounded-xl p-3">
                    <h4 className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                      SKU
                    </h4>
                    <p className="text-base font-medium font-mono text-foreground">
                      {viewingMaterial.sku || 'N/A'}
                    </p>
                  </div>
                  {viewingMaterial.serial_number && (
                    <div className="bg-primary/10 rounded-xl p-3">
                      <h4 className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                        Numero de Serie
                      </h4>
                      <p className="text-base font-medium font-mono text-primary">
                        {viewingMaterial.serial_number}
                      </p>
                    </div>
                  )}
                  <div className="bg-secondary/20 rounded-xl p-3">
                    <h4 className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                      Ubicación
                    </h4>
                    <p className="text-base font-medium flex items-center gap-2 text-foreground">
                      <MapPin className="h-4 w-4" />
                      {viewingMaterial.location?.name || viewingMaterial.location_name || 'Sin ubicación'}
                    </p>
                  </div>
                  <div className="bg-secondary/20 rounded-xl p-3">
                    <h4 className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                      Cantidad
                    </h4>
                    <p className="text-base font-medium text-foreground">
                      {viewingMaterial.quantity} {translateUnit(viewingMaterial.unit_of_measure || 'unit')}
                    </p>
                  </div>
                  <div className="bg-secondary/20 rounded-xl p-3">
                    <h4 className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                      Stock Mínimo
                    </h4>
                    <p className="text-base font-medium text-foreground">
                      {viewingMaterial.min_stock_level}
                    </p>
                  </div>
                </div>

                {viewingMaterial.description && (
                  <div>
                    <h4 className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">
                      Descripción
                    </h4>
                    <p className="text-base text-foreground">
                      {viewingMaterial.description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-4">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="text-base py-3"
                    onClick={() => {
                      setViewingMaterial(null)
                      setHistoryMaterial(viewingMaterial)
                    }}
                  >
                    <History className="h-5 w-5 mr-2" />
                    Ver Historial
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="text-base py-3"
                    onClick={() => setViewingMaterial(null)}
                  >
                    Cerrar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* History Modal */}
        {historyMaterial && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border-2 shadow-2xl">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-xl">
                        <History className="h-6 w-6 text-primary" />
                      </div>
                      Historial de Préstamos
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                      {historyMaterial.name}
                    </p>
                  </div>
                  <button onClick={() => setHistoryMaterial(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {historyLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                  </div>
                ) : historyData ? (
                  <>
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-4 rounded-xl border-2 border-border/50 text-center">
                        <p className="text-2xl font-bold text-foreground">{historyData.total_loans}</p>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Total Préstamos</p>
                      </div>
                      <div className="p-4 rounded-xl border-2 border-border/50 text-center">
                        <p className="text-2xl font-bold text-amber-500">{historyData.active_loans}</p>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Activos</p>
                      </div>
                      <div className="p-4 rounded-xl border-2 border-border/50 text-center">
                        <p className="text-sm font-bold text-foreground truncate">{historyData.top_borrower || '-'}</p>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Top Solicitante</p>
                      </div>
                    </div>

                    {/* Loan Timeline */}
                    {!historyData.history || historyData.history.length === 0 ? (
                      <div className="text-center py-8">
                        <Clock className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                        <p className="text-muted-foreground">No hay préstamos registrados</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {historyData.history.map((loan, idx) => {
                          const isActive = loan.status === 'approved' || loan.status === 'active'
                          const isReturned = loan.status === 'returned'
                          const isOverdue = loan.status === 'overdue'
                          return (
                            <div
                              key={idx}
                              className={`p-4 rounded-xl border-2 border-l-4 ${
                                isActive
                                  ? 'border-l-amber-500 border-border/50'
                                  : isOverdue
                                  ? 'border-l-red-500 border-border/50'
                                  : 'border-l-emerald-500 border-border/50'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium text-foreground">
                                    {loan.borrower.full_name}
                                  </span>
                                </div>
                                <Badge
                                  variant={isActive ? 'warning' : isOverdue ? 'default' : 'success'}
                                  className={isOverdue ? 'bg-red-500/20 text-red-400' : ''}
                                >
                                  {isActive ? 'Activo' : isOverdue ? 'Vencido' : 'Devuelto'}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-secondary/20 rounded-lg px-3 py-2">
                                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Cantidad</p>
                                  <p className="text-sm font-medium text-foreground">{loan.quantity_loaned}</p>
                                </div>
                                <div className="bg-secondary/20 rounded-lg px-3 py-2">
                                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Duración</p>
                                  <p className="text-sm font-medium text-foreground">{loan.duration_days} días</p>
                                </div>
                                <div className="bg-secondary/20 rounded-lg px-3 py-2">
                                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Fecha Préstamo</p>
                                  <p className="text-sm font-medium text-foreground">
                                    {new Date(loan.issued_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </p>
                                </div>
                                <div className="bg-secondary/20 rounded-lg px-3 py-2">
                                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                    {loan.actual_return_date ? 'Devuelto' : 'Vence'}
                                  </p>
                                  <p className="text-sm font-medium text-foreground">
                                    {loan.actual_return_date
                                      ? new Date(loan.actual_return_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                                      : new Date(loan.expected_return_date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                                    }
                                  </p>
                                </div>
                              </div>
                              {loan.condition_on_return && loan.condition_on_return !== loan.condition_on_pickup && (
                                <div className="mt-2 text-xs text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg">
                                  Condición al devolver: {loan.condition_on_return}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Error al cargar historial</p>
                  </div>
                )}

                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full text-base py-3"
                  onClick={() => setHistoryMaterial(null)}
                >
                  Cerrar
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* QR Scanner Modal */}
        {isScanning && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md border-2 shadow-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5 text-primary" />
                    Escanear Material
                  </CardTitle>
                  <button onClick={stopScanning} className="text-muted-foreground hover:text-foreground">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                  />
                  <div className="absolute inset-0 border-4 border-primary/50 rounded-xl">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-primary rounded-lg animate-pulse" />
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
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border-2 shadow-2xl">
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
                      <h4 className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">Imagen</h4>
                      <img src={scannedMaterial.image} alt={scannedMaterial.name} className="w-full rounded-xl border-2 border-border" />
                    </div>
                  )}
                  {scannedMaterial.qr_image && (
                    <div>
                      <h4 className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">Codigo QR</h4>
                      <div className="bg-white p-4 rounded-xl inline-block">
                        <img src={scannedMaterial.qr_image} alt="QR" className="w-32 h-32" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">{scannedMaterial.qr_code}</p>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary/20 rounded-xl p-3">
                    <h4 className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">SKU</h4>
                    <p className="text-base font-medium font-mono text-foreground">{scannedMaterial.sku}</p>
                  </div>
                  {scannedMaterial.serial_number && (
                    <div className="bg-primary/10 rounded-xl p-3">
                      <h4 className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Numero de Serie</h4>
                      <p className="text-base font-medium font-mono text-primary">{scannedMaterial.serial_number}</p>
                    </div>
                  )}
                  <div className="bg-secondary/20 rounded-xl p-3">
                    <h4 className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Ubicacion</h4>
                    <p className="text-base font-medium text-foreground">{scannedMaterial.location_detail?.name || scannedMaterial.location_name || 'Sin ubicacion'}</p>
                  </div>
                  <div className="bg-secondary/20 rounded-xl p-3">
                    <h4 className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Cantidad Total</h4>
                    <p className="text-base font-medium text-foreground">{scannedMaterial.quantity} {translateUnit(scannedMaterial.unit_of_measure || 'unit')}</p>
                  </div>
                  <div className="bg-secondary/20 rounded-xl p-3">
                    <h4 className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Disponible</h4>
                    <p className="text-base font-medium text-foreground">{scannedMaterial.available_quantity} {translateUnit(scannedMaterial.unit_of_measure || 'unit')}</p>
                  </div>
                  <div className="bg-secondary/20 rounded-xl p-3">
                    <h4 className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Estado</h4>
                    <Badge variant={scannedMaterial.status === 'available' ? 'success' : 'warning'}>
                      {getStatusLabel(scannedMaterial.status)}
                    </Badge>
                  </div>
                </div>

                {scannedMaterial.description && (
                  <div>
                    <h4 className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Descripcion</h4>
                    <p className="text-base text-foreground">{scannedMaterial.description}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 pt-4">
                  {(scannedMaterial.category_detail?.is_consumable || scannedMaterial.is_consumable) && (
                    <Button onClick={() => setShowAddStock(true)} size="lg" className="text-base py-3">
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Stock
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => setScannedMaterial(null)} size="lg" className="text-base py-3">
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
            <Card className="w-full max-w-md border-2 shadow-2xl">
              <CardHeader>
                <CardTitle>Agregar Stock</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl">
                  <p className="text-sm font-medium text-foreground">{scannedMaterial.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Stock actual: {scannedMaterial.quantity} {translateUnit(scannedMaterial.unit_of_measure || 'unit')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    Cantidad a agregar
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={addStockQuantity}
                    onChange={(e: any) => setAddStockQuantity(parseInt(e.target.value) || 1)}
                    className="rounded-xl border-2 text-base"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={handleAddStock} size="lg" className="text-base py-3">
                    Agregar
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="text-base py-3"
                    onClick={() => {
                      setShowAddStock(false)
                      setAddStockQuantity(1)
                    }}
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