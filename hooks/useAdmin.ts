import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminService, AdminAccount } from '@/services/admin.service'
import toast from 'react-hot-toast'

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminService.getStats(),
    staleTime: 30000,
  })
}

export function useAdminAccounts() {
  return useQuery({
    queryKey: ['admin-accounts'],
    queryFn: () => adminService.getAccounts(),
    staleTime: 30000,
  })
}

export function useAdminUpdateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<AdminAccount> }) =>
      adminService.updateAccount(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      toast.success('Cuenta actualizada exitosamente')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar cuenta')
    },
  })
}

export function useAdminPayments() {
  return useQuery({
    queryKey: ['admin-payments'],
    queryFn: () => adminService.getPayments(),
    staleTime: 30000,
  })
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminService.getUsers(),
    staleTime: 30000,
  })
}
