export interface Material {
  id: number
  account: number
  category: number
  location: number
  name: string
  description: string
  qr_code: string
  qr_image: string | null
  sku: string
  barcode: string | null
  is_consumable: boolean
  total_quantity: number
  available_quantity: number
  unit_of_measure: string
  minimum_stock_level: number | null
  reorder_quantity: number | null
  is_available_for_loan: boolean
  requires_facial_auth: boolean
  material_state: 'disponible' | 'en_prestamo' | 'mantenimiento' | 'danado' | 'retirado'
  image: string | null
  notes: string
  created_at: string
  updated_at: string
}

export interface Category {
  id: number
  account: number
  name: string
  description: string
  is_consumable: boolean
}

export interface Location {
  id: number
  account: number
  name: string
  address_line1: string
  address_line2: string | null
  city: string
  state: string
  postal_code: string
  country: string
  is_active: boolean
}
