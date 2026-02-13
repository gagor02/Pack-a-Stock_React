'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Users,
  ChevronLeft,
  Moon,
  Sun,
  LogOut,
  Shield,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Cuentas', href: '/admin/accounts', icon: Building2 },
  { name: 'Pagos', href: '/admin/payments', icon: CreditCard },
  { name: 'Usuarios', href: '/admin/users', icon: Users },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()
  const { sidebarCollapsed, toggleSidebar, theme, toggleTheme } = useUIStore()

  const handleLogout = () => {
    logout()
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }

  return (
    <aside
      className={clsx(
        'fixed inset-y-0 left-0 z-50 flex flex-col bg-card border-r border-border transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-400" />
            <span className="text-xl font-bold text-foreground">Admin</span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          title={sidebarCollapsed ? 'Expandir' : 'Colapsar'}
        >
          <ChevronLeft
            className={clsx(
              'h-5 w-5 transition-transform',
              sidebarCollapsed && 'rotate-180'
            )}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
        {navigation.map((item) => {
          const isActive =
            (item.href === '/admin' && pathname === '/admin') ||
            (item.href !== '/admin' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
              title={sidebarCollapsed ? item.name : undefined}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!sidebarCollapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-4 space-y-2">
        <button
          onClick={toggleTheme}
          className={clsx(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            sidebarCollapsed && 'justify-center'
          )}
          title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
        >
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          {!sidebarCollapsed && (
            <span>{theme === 'light' ? 'Modo oscuro' : 'Modo claro'}</span>
          )}
        </button>

        {user && (
          <div className={clsx('flex items-center gap-3 rounded-lg p-2', sidebarCollapsed && 'justify-center')}>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-semibold flex-shrink-0">
              {user.email[0].toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.full_name || user.email}
                </p>
                <p className="text-xs text-blue-400 font-medium">Superadmin</p>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleLogout}
          className={clsx(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-destructive hover:bg-destructive/10',
            sidebarCollapsed && 'justify-center'
          )}
          title="Cerrar sesion"
        >
          <LogOut className="h-5 w-5" />
          {!sidebarCollapsed && <span>Cerrar sesion</span>}
        </button>
      </div>
    </aside>
  )
}
