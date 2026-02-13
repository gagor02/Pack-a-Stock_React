import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { subscriptionService, SubscribeData } from '@/services/subscription.service'
import toast from 'react-hot-toast'

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => subscriptionService.getPlans(),
    staleTime: 60000,
  })
}

export function useSubscriptionStatus() {
  return useQuery({
    queryKey: ['subscription-status'],
    queryFn: () => subscriptionService.getSubscriptionStatus(),
    staleTime: 30000,
  })
}

export function usePaymentHistory() {
  return useQuery({
    queryKey: ['payment-history'],
    queryFn: () => subscriptionService.getPaymentHistory(),
    staleTime: 30000,
  })
}

export function useSubscribe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: SubscribeData) => subscriptionService.subscribe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] })
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] })
      queryClient.invalidateQueries({ queryKey: ['payment-history'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      toast.success('Suscripcion activada exitosamente')
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          error.response?.data?.errors?.plan_id?.[0] ||
          'Error al procesar el pago'
      )
    },
  })
}
