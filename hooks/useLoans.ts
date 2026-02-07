import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { loansService } from '@/services/loans.service'
import toast from 'react-hot-toast'

// ========== LOAN REQUESTS HOOKS ==========

export function useLoanRequests(params?: { status?: string; page?: number }) {
  return useQuery({
    queryKey: ['loan-requests', params],
    queryFn: () => loansService.getLoanRequests(params),
    staleTime: 30000, // 30 seconds
  })
}

export function usePendingRequests() {
  return useQuery({
    queryKey: ['loan-requests', 'pending'],
    queryFn: () => loansService.getPendingRequests(),
    staleTime: 10000, // 10 seconds - refresh more frequently for pending items
  })
}

export function useMyRequests() {
  return useQuery({
    queryKey: ['loan-requests', 'my-requests'],
    queryFn: () => loansService.getMyRequests(),
    staleTime: 30000,
  })
}

export function useLoanRequest(id: number) {
  return useQuery({
    queryKey: ['loan-requests', id],
    queryFn: () => loansService.getLoanRequest(id),
    enabled: !!id,
  })
}

export function useCreateLoanRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: loansService.createLoanRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-requests'] })
      toast.success('Solicitud de préstamo creada exitosamente')
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          error.response?.data?.detail ||
          'Error al crear solicitud'
      )
    },
  })
}

export function useApproveLoanRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) =>
      loansService.approveLoanRequest(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-requests'] })
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      toast.success('Solicitud aprobada exitosamente')
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Error al aprobar solicitud'
      )
    },
  })
}

export function useRejectLoanRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      loansService.rejectLoanRequest(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-requests'] })
      toast.success('Solicitud rechazada')
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Error al rechazar solicitud'
      )
    },
  })
}

export function useUpdateLoanRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: any }) =>
      loansService.updateLoanRequest(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loan-requests'] })
      queryClient.invalidateQueries({ queryKey: ['loan-requests', variables.id] })
      toast.success('Solicitud actualizada exitosamente')
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Error al actualizar solicitud'
      )
    },
  })
}

export function useDeleteLoanRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: loansService.deleteLoanRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-requests'] })
      toast.success('Solicitud eliminada exitosamente')
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Error al eliminar solicitud'
      )
    },
  })
}

// ========== LOANS HOOKS ==========

export function useLoans(params?: {
  status?: string
  borrower?: number
  material?: number
  page?: number
}) {
  return useQuery({
    queryKey: ['loans', params],
    queryFn: () => loansService.getLoans(params),
    staleTime: 30000,
  })
}

export function useActiveLoans() {
  return useQuery({
    queryKey: ['loans', 'active'],
    queryFn: () => loansService.getActiveLoans(),
    staleTime: 20000, // Refresh more frequently for active items
  })
}

export function useOverdueLoans() {
  return useQuery({
    queryKey: ['loans', 'overdue'],
    queryFn: () => loansService.getOverdueLoans(),
    staleTime: 20000,
  })
}

export function useMyLoans() {
  return useQuery({
    queryKey: ['loans', 'my-loans'],
    queryFn: () => loansService.getMyLoans(),
    staleTime: 30000,
  })
}

export function useLoan(id: number) {
  return useQuery({
    queryKey: ['loans', id],
    queryFn: () => loansService.getLoan(id),
    enabled: !!id,
  })
}

export function useCreateLoan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: loansService.createLoan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      toast.success('Préstamo creado exitosamente')
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          error.response?.data?.detail ||
          'Error al crear préstamo'
      )
    },
  })
}

export function useReturnLoan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      returnData,
    }: {
      id: number
      returnData: {
        condition: string
        damage_notes?: string
        signature?: string
      }
    }) => loansService.returnLoan(id, returnData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      toast.success('Préstamo devuelto exitosamente')
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Error al devolver préstamo'
      )
    },
  })
}

export function useUpdateLoan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: any }) =>
      loansService.updateLoan(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['loans', variables.id] })
      toast.success('Préstamo actualizado exitosamente')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar préstamo')
    },
  })
}

export function useDeleteLoan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: loansService.deleteLoan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      toast.success('Préstamo eliminado exitosamente')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al eliminar préstamo')
    },
  })
}

// ========== LOAN EXTENSIONS HOOKS ==========

export function useLoanExtensions(params?: { status?: string; loan?: number }) {
  return useQuery({
    queryKey: ['loan-extensions', params],
    queryFn: () => loansService.getLoanExtensions(params),
    staleTime: 30000,
  })
}

export function usePendingExtensions() {
  return useQuery({
    queryKey: ['loan-extensions', 'pending'],
    queryFn: () => loansService.getPendingExtensions(),
    staleTime: 10000,
  })
}

export function useCreateLoanExtension() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: loansService.createLoanExtension,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-extensions'] })
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      toast.success('Solicitud de extensión creada exitosamente')
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          error.response?.data?.detail ||
          'Error al crear extensión'
      )
    },
  })
}

export function useApproveExtension() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, notes }: { id: number; notes?: string }) =>
      loansService.approveExtension(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-extensions'] })
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      toast.success('Extensión aprobada exitosamente')
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Error al aprobar extensión'
      )
    },
  })
}

export function useRejectExtension() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      loansService.rejectExtension(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-extensions'] })
      toast.success('Extensión rechazada')
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Error al rechazar extensión'
      )
    },
  })
}
