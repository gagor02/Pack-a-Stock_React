import api from '@/lib/api'

export interface AdminStats {
  total_accounts: number
  active_accounts: number
  total_users: number
  active_users: number
  total_revenue: number
  payments_this_month: number
  plan_distribution: Record<string, number>
  recent_payments: any[]
}

export interface AdminAccount {
  id: number
  company_name: string
  email: string
  phone: string
  subscription_plan: string
  max_users: number
  max_locations: number
  is_active: boolean
  subscription_start_date: string | null
  subscription_end_date: string | null
  user_count: number
  payment_count: number
  created_at: string
  updated_at: string
}

export const adminService = {
  getStats: async (): Promise<AdminStats> => {
    const { data } = await api.get('/admin/stats/')
    return data.data
  },

  getAccounts: async (): Promise<AdminAccount[]> => {
    const { data } = await api.get('/admin/accounts/')
    return data.data
  },

  updateAccount: async (id: number, updates: Partial<AdminAccount>) => {
    const { data } = await api.patch(`/admin/accounts/${id}/`, updates)
    return data
  },

  getPayments: async () => {
    const { data } = await api.get('/admin/payments/')
    return data.data
  },

  getUsers: async () => {
    const { data } = await api.get('/admin/users/')
    return data.data
  },

  toggleUser: async (id: number, action: 'block' | 'unblock') => {
    const { data } = await api.post(`/admin/users/${id}/toggle/`, { action })
    return data
  },

  deleteAccount: async (id: number) => {
    const { data } = await api.delete(`/admin/accounts/${id}/delete/`)
    return data
  },
}

export default adminService
