'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import {
  LayoutDashboard,
  Package,
  Tags,
  MapPin,
  ArrowLeftRight,
  FileText,
  Users,
  BarChart3,
  Settings,
  QrCode,
  ChevronLeft,
  Moon,
  Sun,
  LogOut,
} from 'lucide-react'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['inventarista', 'employee'],
  },
  {
    name: 'Materiales',
    href: '/materials',
    icon: Package,
    roles: ['inventarista', 'employee'],
  },
  {
    name: 'Categorías',
    href: '/categories',
    icon: Tags,
    roles: ['inventarista', 'employee'],
  },
  {
    name: 'Ubicaciones',
    href: '/locations',
    icon: MapPin,
    roles: ['inventarista', 'employee'],
  },
  {
    name: 'Etiquetas',
    href: '/labels',
    icon: QrCode,
    roles: ['inventarista'],
  },
  {
    name: 'Préstamos',
    href: '/loans',
    icon: ArrowLeftRight,
    roles: ['inventarista', 'employee'],
  },
  {
    name: 'Solicitudes',
    href: '/requests',
    icon: FileText,
    roles: ['inventarista'],
  },
  {
    name: 'Usuarios',
    href: '/users',
    icon: Users,
    roles: ['inventarista'],
  },
  {
    name: 'Reportes',
    href: '/reports',
    icon: BarChart3,
    roles: ['inventarista'],
  },
  {
    name: 'Configuración',
    href: '/settings',
    icon: Settings,
    roles: ['inventarista', 'employee'],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()
  const { sidebarCollapsed, toggleSidebar, theme, toggleTheme } = useUIStore()

  const filteredNav = navigation.filter((item) =>
    user ? item.roles.includes(user.user_type) : false
  )

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
          <span className="text-xl font-bold text-foreground">
            Pack-a-Stock
          </span>
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
        {filteredNav.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
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
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={clsx(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            sidebarCollapsed && 'justify-center'
          )}
          title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
        >
          {theme === 'light' ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
          {!sidebarCollapsed && (
            <span>{theme === 'light' ? 'Modo oscuro' : 'Modo claro'}</span>
          )}
        </button>

        {/* User info */}
        {user && (
          <div
            className={clsx(
              'flex items-center gap-3 rounded-lg p-2',
              sidebarCollapsed && 'justify-center'
            )}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold flex-shrink-0">
              {user.email[0].toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.full_name || user.email}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user.user_type}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={clsx(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-destructive hover:bg-destructive/10',
            sidebarCollapsed && 'justify-center'
          )}
          title="Cerrar sesión"
        >
          <LogOut className="h-5 w-5" />
          {!sidebarCollapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  )
}
