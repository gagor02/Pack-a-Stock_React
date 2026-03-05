import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface NotificationStore {
  readIds: string[]
  markRead: (id: string) => void
  markAllRead: (ids: string[]) => void
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set) => ({
      readIds: [],
      markRead: (id) => set((s) => ({ readIds: [...new Set([...s.readIds, id])] })),
      markAllRead: (ids) => set((s) => ({ readIds: [...new Set([...s.readIds, ...ids])] })),
    }),
    { name: 'pas-notifications' }
  )
)
