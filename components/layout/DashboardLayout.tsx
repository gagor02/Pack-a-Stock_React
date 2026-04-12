'use client'

import { useUIStore } from '@/store/uiStore'
import { clsx } from 'clsx'
import Sidebar from './Sidebar'
import CatalogMode from '@/components/CatalogMode'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { sidebarCollapsed } = useUIStore()

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <CatalogMode />
      <main
        className={clsx(
          'transition-all duration-300 h-screen overflow-y-auto',
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        )}
      >
        {children}
      </main>
    </div>
  )
}
