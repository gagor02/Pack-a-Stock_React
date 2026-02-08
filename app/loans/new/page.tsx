'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { Card, Button, Input, Badge } from '@/components/ui'
import DashboardLayout from '@/components/layout/DashboardLayout'
import {
  Camera,
  Search,
  Plus,
  Minus,
  Trash2,
  User,
  Package,
  Calendar,
  FileText,
  ArrowLeft,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import jsQR from 'jsqr'

interface Material {
  id: number
  name: string
  sku: string
  category_name?: string
  available_quantity: number
  is_consumable: boolean
  qr_code?: string
}

interface SelectedMaterial extends Material {
  quantity: number
}

interface Employee {
  id: number
  email: string
  first_name: string
  last_name: string
  user_type: string
}

export default function NewLoanPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isScanningRef = useRef(false)
  const streamRef = useRef<MediaStream | null>(null)

  const [isScanning, setIsScanning] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Employee | null>(null)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [users, setUsers] = useState<Employee[]>([])
  const [showUserDropdown, setShowUserDropdown] = useState(false)

  const [selectedMaterials, setSelectedMaterials] = useState<SelectedMaterial[]>([])
  const [materialSearchQuery, setMaterialSearchQuery] = useState('')
  const [materials, setMaterials] = useState<Material[]>([])
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false)

  const [returnDate, setReturnDate] = useState('')
  const [notes, setNotes] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get('/auth/users/', {
          params: { user_type: 'employee' }
        })
        setUsers(response.data.results || response.data)
      } catch (error) {
        console.error('Error fetching users:', error)
      }
    }
    fetchUsers()
  }, [])

  useEffect(() => {
    const fetchMaterials = async () => {
      if (materialSearchQuery.length < 2) {
        setMaterials([])
        return
      }
      try {
        const response = await api.get('/materials/materials/', {
          params: { search: materialSearchQuery }
        })
        setMaterials(response.data.results || response.data)
      } catch (error) {
        console.error('Error fetching materials:', error)
      }
    }
    const timer = setTimeout(fetchMaterials, 300)
    return () => clearTimeout(timer)
  }, [materialSearchQuery])

  const startScanning = async () => {
    try {
      setScanError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      streamRef.current = stream
      isScanningRef.current = true
      setIsScanning(true)
    } catch (error) {
      console.error('Error accessing camera:', error)
      setScanError('No se pudo acceder a la cámara')
      toast.error('No se pudo acceder a la cámara')
    }
  }

  // Connect stream to video element after it renders
  useEffect(() => {
    if (isScanning && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().then(() => {
        requestAnimationFrame(scanQRCode)
      })
    }
  }, [isScanning])

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
    setScanError(null)
  }

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

      const material = response.data

      const existing = selectedMaterials.find(m => m.id === material.id)
      if (existing) {
        toast.error('Este material ya fue agregado')
        return
      }

      setSelectedMaterials(prev => [...prev, { ...material, quantity: 1 }])
      toast.success(`Material agregado: ${material.name}`)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Material no encontrado')
    }
  }

  const addMaterialManually = (material: Material) => {
    const existing = selectedMaterials.find(m => m.id === material.id)
    if (existing) {
      toast.error('Este material ya fue agregado')
      return
    }
    setSelectedMaterials(prev => [...prev, { ...material, quantity: 1 }])
    setMaterialSearchQuery('')
    setShowMaterialDropdown(false)
    toast.success(`Material agregado: ${material.name}`)
  }

  const updateQuantity = (materialId: number, delta: number) => {
    setSelectedMaterials(prev =>
      prev.map(m => {
        if (m.id === materialId) {
          const newQuantity = m.quantity + delta
          if (newQuantity < 1) return m
          if (newQuantity > m.available_quantity) {
            toast.error(`Solo hay ${m.available_quantity} disponibles`)
            return m
          }
          return { ...m, quantity: newQuantity }
        }
        return m
      })
    )
  }

  const removeMaterial = (materialId: number) => {
    setSelectedMaterials(prev => prev.filter(m => m.id !== materialId))
  }

  const handleCreateLoan = async () => {
    if (!selectedUser) {
      toast.error('Selecciona un usuario')
      return
    }

    if (selectedMaterials.length === 0) {
      toast.error('Agrega al menos un material')
      return
    }

    if (!returnDate) {
      toast.error('Selecciona una fecha de devolución')
      return
    }

    setIsCreating(true)
    try {
      // Backend expects one loan per material
      const loanPromises = selectedMaterials.map(m =>
        api.post('/loans/loans/', {
          borrower: selectedUser.id,
          material: m.id,
          quantity_loaned: m.quantity,
          expected_return_date: returnDate,
          condition_on_pickup: 'good'
        })
      )

      await Promise.all(loanPromises)
      // Invalidate loans cache so the loans page shows the new loans
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['loan-requests'] })
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      toast.success(`${selectedMaterials.length} préstamo(s) creado(s) exitosamente`)
      router.push('/loans')
    } catch (error: any) {
      console.error('Error creating loan:', error)
      const detail = error.response?.data
      const msg = typeof detail === 'object' ? JSON.stringify(detail) : detail
      toast.error(msg || 'Error al crear el préstamo')
    } finally {
      setIsCreating(false)
    }
  }

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    `${u.first_name} ${u.last_name}`.toLowerCase().includes(userSearchQuery.toLowerCase())
  )

  const today = new Date().toISOString().split('T')[0]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/loans')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">Crear Préstamo</h1>
              <p className="text-gray-400">Préstamos directos (auto-aprobados)</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-semibold text-white">Usuario</h2>
              </div>

              {selectedUser ? (
                <div className="p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white font-medium">
                      {selectedUser.first_name} {selectedUser.last_name}
                    </p>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="text-gray-400 hover:text-red-400"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-400">{selectedUser.email}</p>
                  <Badge variant="secondary" className="mt-2">
                    {selectedUser.user_type === 'employee' ? 'Empleado' : 'Usuario'}
                  </Badge>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Buscar usuario..."
                      value={userSearchQuery}
                      onChange={(e) => {
                        setUserSearchQuery(e.target.value)
                        setShowUserDropdown(true)
                      }}
                      onFocus={() => setShowUserDropdown(true)}
                      className="pl-10"
                    />
                  </div>

                  {showUserDropdown && userSearchQuery.length > 0 && (
                    <div className="absolute z-10 w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map(u => (
                          <button
                            key={u.id}
                            onClick={() => {
                              setSelectedUser(u)
                              setUserSearchQuery('')
                              setShowUserDropdown(false)
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-purple-900/20 transition-colors border-b border-gray-700 last:border-0"
                          >
                            <p className="text-white font-medium">
                              {u.first_name} {u.last_name}
                            </p>
                            <p className="text-sm text-gray-400">{u.email}</p>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-gray-400 text-center">
                          No se encontraron usuarios
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Camera className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-semibold text-white">Escanear QR</h2>
              </div>

              {!isScanning ? (
                <Button
                  onClick={startScanning}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Camera className="w-5 h-5" />
                  Iniciar Escáner
                </Button>
              ) : (
                <div className="space-y-4">
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
                  <Button
                    onClick={stopScanning}
                    variant="secondary"
                    className="w-full"
                  >
                    Detener Escáner
                  </Button>
                  {scanError && (
                    <p className="text-red-400 text-sm text-center">{scanError}</p>
                  )}
                </div>
              )}

              <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <p className="text-sm text-blue-300">
                  Apunta la cámara al código QR del material
                </p>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-semibold text-white">Búsqueda Manual</h2>
              </div>

              <div className="relative">
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Buscar material..."
                    value={materialSearchQuery}
                    onChange={(e) => {
                      setMaterialSearchQuery(e.target.value)
                      setShowMaterialDropdown(true)
                    }}
                    onFocus={() => setShowMaterialDropdown(true)}
                    className="pl-10"
                  />
                </div>

                {showMaterialDropdown && materials.length > 0 && (
                  <div className="absolute z-10 w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {materials.map(m => (
                      <button
                        key={m.id}
                        onClick={() => addMaterialManually(m)}
                        className="w-full px-4 py-3 text-left hover:bg-purple-900/20 transition-colors border-b border-gray-700 last:border-0"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">{m.name}</p>
                            <p className="text-sm text-gray-400">SKU: {m.sku}</p>
                          </div>
                          <Badge variant={m.available_quantity > 0 ? 'success' : 'danger'}>
                            {m.available_quantity} disponibles
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-semibold text-white">
                  Materiales Seleccionados ({selectedMaterials.length})
                </h2>
              </div>

              {selectedMaterials.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No hay materiales seleccionados</p>
                  <p className="text-sm mt-1">Escanea un QR o busca manualmente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedMaterials.map(material => (
                    <div
                      key={material.id}
                      className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-white font-medium">{material.name}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-sm text-gray-400">SKU: {material.sku}</p>
                            {material.category_name && (
                              <Badge variant="secondary" className="text-xs">
                                {material.category_name}
                              </Badge>
                            )}
                            <Badge variant={material.is_consumable ? 'warning' : 'info'}>
                              {material.is_consumable ? 'Consumible' : 'No consumible'}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 bg-gray-700 rounded-lg p-1">
                            <button
                              onClick={() => updateQuantity(material.id, -1)}
                              className="p-1 hover:bg-gray-600 rounded transition-colors"
                              disabled={material.quantity <= 1}
                            >
                              <Minus className="w-4 h-4 text-white" />
                            </button>
                            <span className="px-3 text-white font-medium min-w-[2rem] text-center">
                              {material.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(material.id, 1)}
                              className="p-1 hover:bg-gray-600 rounded transition-colors"
                              disabled={material.quantity >= material.available_quantity}
                            >
                              <Plus className="w-4 h-4 text-white" />
                            </button>
                          </div>

                          <button
                            onClick={() => removeMaterial(material.id)}
                            className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-semibold text-white">Detalles del Préstamo</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Fecha de Devolución *
                  </label>
                  <Input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    min={today}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Notas (Opcional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Información adicional sobre el préstamo..."
                  />
                </div>

                <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-green-300 font-medium">Auto-aprobado</p>
                      <p className="text-sm text-green-400/80 mt-1">
                        Los préstamos creados por inventaristas se aprueban automáticamente
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => router.push('/loans')}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateLoan}
                disabled={!selectedUser || selectedMaterials.length === 0 || !returnDate || isCreating}
                isLoading={isCreating}
                className="flex-1"
              >
                Crear Préstamo
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
