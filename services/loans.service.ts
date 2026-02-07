import api from '@/lib/api'

// Types
export interface LoanRequest {
  id: number
  material: number
  material_detail?: any
  requester: number
  requester_detail?: any
  quantity_requested: number
  purpose: string
  desired_pickup_date: string
  desired_return_date: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed'
  reviewed_by?: number
  reviewed_at?: string
  review_notes?: string
  created_at: string
  updated_at: string
}

export interface Loan {
  id: number
  loan_request?: number
  material: number
  material_detail?: any
  borrower: number
  borrower_detail?: any
  issued_by: number
  returned_to?: number
  quantity_loaned: number
  quantity_returned: number
  is_consumable_loan: boolean
  issued_at: string
  expected_return_date?: string
  actual_return_date?: string
  facial_auth_verified: boolean
  facial_auth_at?: string
  pickup_signature?: string
  return_signature?: string
  condition_on_pickup: string
  condition_on_return?: string
  damage_notes?: string
  status: 'active' | 'returned' | 'overdue' | 'lost'
  is_overdue: boolean
  days_until_return: number
  is_fully_returned: boolean
  created_at: string
  updated_at: string
}

export interface LoanExtension {
  id: number
  loan: number
  requested_by: number
  new_return_date: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by?: number
  reviewed_at?: string
  review_notes?: string
  created_at: string
}

export const loansService = {
  // ========== LOAN REQUESTS ==========

  // Get all loan requests
  getLoanRequests: async (params?: {
    status?: string
    page?: number
  }) => {
    const { data } = await api.get('/loans/loan-requests/', { params })
    return data
  },

  // Get pending loan requests (inventarista only)
  getPendingRequests: async () => {
    const { data } = await api.get('/loans/loan-requests/pending/')
    return data
  },

  // Get my requests (employee)
  getMyRequests: async () => {
    const { data } = await api.get('/loans/loan-requests/my_requests/')
    return data
  },

  // Get single loan request
  getLoanRequest: async (id: number) => {
    const { data } = await api.get(`/loans/loan-requests/${id}/`)
    return data
  },

  // Create loan request
  createLoanRequest: async (request: {
    material: number
    quantity_requested: number
    purpose: string
    desired_pickup_date: string
    desired_return_date: string
  }) => {
    const { data } = await api.post('/loans/loan-requests/', request)
    return data
  },

  // Approve loan request (inventarista only)
  approveLoanRequest: async (id: number, notes?: string) => {
    const { data } = await api.post(`/loans/loan-requests/${id}/approve/`, {
      notes: notes || '',
    })
    return data
  },

  // Reject loan request (inventarista only)
  rejectLoanRequest: async (id: number, reason: string) => {
    const { data } = await api.post(`/loans/loan-requests/${id}/reject/`, {
      notes: reason,
    })
    return data
  },

  // Update loan request
  updateLoanRequest: async (id: number, updates: Partial<LoanRequest>) => {
    const { data } = await api.patch(`/loans/loan-requests/${id}/`, updates)
    return data
  },

  // Delete loan request
  deleteLoanRequest: async (id: number) => {
    await api.delete(`/loans/loan-requests/${id}/`)
  },

  // ========== LOANS ==========

  // Get all loans
  getLoans: async (params?: {
    status?: string
    borrower?: number
    material?: number
    page?: number
  }) => {
    const { data } = await api.get('/loans/loans/', { params })
    return data
  },

  // Get active loans
  getActiveLoans: async () => {
    const { data } = await api.get('/loans/loans/active/')
    return data
  },

  // Get overdue loans
  getOverdueLoans: async () => {
    const { data } = await api.get('/loans/loans/overdue/')
    return data
  },

  // Get my loans (employee)
  getMyLoans: async () => {
    const { data } = await api.get('/loans/loans/my_loans/')
    return data
  },

  // Get single loan
  getLoan: async (id: number) => {
    const { data } = await api.get(`/loans/loans/${id}/`)
    return data
  },

  // Create loan (inventarista only)
  createLoan: async (loan: {
    material: number
    borrower: number
    quantity_loaned: number
    expected_return_date?: string
    loan_request?: number
  }) => {
    const { data } = await api.post('/loans/loans/', loan)
    return data
  },

  // Return loan
  returnLoan: async (
    id: number,
    returnData: {
      condition: string
      damage_notes?: string
      signature?: string
    }
  ) => {
    const { data } = await api.post(`/loans/loans/${id}/return_loan/`, returnData)
    return data
  },

  // Update loan
  updateLoan: async (id: number, updates: Partial<Loan>) => {
    const { data } = await api.patch(`/loans/loans/${id}/`, updates)
    return data
  },

  // Delete loan
  deleteLoan: async (id: number) => {
    await api.delete(`/loans/loans/${id}/`)
  },

  // ========== LOAN EXTENSIONS ==========

  // Get loan extensions
  getLoanExtensions: async (params?: { status?: string; loan?: number }) => {
    const { data } = await api.get('/loans/loan-extensions/', { params })
    return data
  },

  // Get pending extensions
  getPendingExtensions: async () => {
    const { data } = await api.get('/loans/loan-extensions/pending/')
    return data
  },

  // Create loan extension request
  createLoanExtension: async (extension: {
    loan: number
    new_return_date: string
    reason: string
  }) => {
    const { data } = await api.post('/loans/loan-extensions/', extension)
    return data
  },

  // Approve extension (inventarista only)
  approveExtension: async (id: number, notes?: string) => {
    const { data } = await api.post(`/loans/loan-extensions/${id}/approve/`, {
      notes: notes || '',
    })
    return data
  },

  // Reject extension (inventarista only)
  rejectExtension: async (id: number, reason: string) => {
    const { data } = await api.post(`/loans/loan-extensions/${id}/reject/`, {
      notes: reason,
    })
    return data
  },
}

export default loansService
