export interface User {
  id: number
  email: string
  full_name?: string
  first_name?: string
  last_name?: string
  user_type: 'inventarista' | 'empleado'
  is_superuser?: boolean
  account: any
  is_active: boolean
}

export interface AuthTokens {
  access: string
  refresh: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  access: string
  refresh: string
  user: User
}
