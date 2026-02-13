import api from '@/lib/api'

export interface SubscriptionPlan {
  id: number
  name: 'monthly' | 'quarterly' | 'annual'
  display_name: string
  price: number
  duration_days: number
  max_users: number
  max_locations: number
  is_active: boolean
}

export interface Payment {
  id: number
  account: number
  plan: number
  plan_name: string
  account_name: string
  amount: number
  card_last_four: string
  card_holder_name: string
  status: 'completed' | 'failed' | 'refunded'
  paid_at: string
  created_at: string
}

export interface SubscriptionStatus {
  subscription_plan: string
  max_users: number
  max_locations: number
  subscription_start_date: string | null
  subscription_end_date: string | null
  is_active: boolean
}

export interface SubscribeData {
  plan_id: number
  card_number: string
  card_holder: string
  expiry: string
  cvv: string
}

export const subscriptionService = {
  getPlans: async (): Promise<SubscriptionPlan[]> => {
    const { data } = await api.get('/auth/plans/')
    return data.data
  },

  subscribe: async (subscribeData: SubscribeData) => {
    const { data } = await api.post('/auth/subscribe/', subscribeData)
    return data
  },

  getPaymentHistory: async (): Promise<Payment[]> => {
    const { data } = await api.get('/auth/payments/')
    return data.data
  },

  getSubscriptionStatus: async (): Promise<SubscriptionStatus> => {
    const { data } = await api.get('/auth/subscription/')
    return data.data
  },
}

export default subscriptionService
