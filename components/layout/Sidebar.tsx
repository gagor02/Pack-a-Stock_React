'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { useNotifications } from '@/hooks/useNotifications'
import NotificationBell from '@/components/notifications/NotificationBell'
import { useCommandPaletteStore } from '@/store/commandPaletteStore'
import {
  LayoutDashboard,
  Package,
  Tags,
  MapPin,
  ArrowLeftRight,
  Inbox,
  Users,
  BarChart3,
  Settings,
  QrCode,
  CreditCard,
  ChevronLeft,
  Moon,
  Sun,
  LogOut,
  ShieldCheck,
  Search,
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
    name: 'Solicitudes',
    href: '/requests',
    icon: Inbox,
    roles: ['inventarista'],
  },
  {
    name: 'Préstamos',
    href: '/loans',
    icon: ArrowLeftRight,
    roles: ['inventarista', 'employee'],
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
    name: 'Suscripcion',
    href: '/subscription',
    icon: CreditCard,
    roles: ['inventarista'],
  },
  {
    name: 'Registros(Logs)',
    href: '/audit',
    icon: ShieldCheck,
    roles: ['inventarista'],
  },
  {
    name: 'Configuracion',
    href: '/settings',
    icon: Settings,
    roles: ['inventarista', 'employee'],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()
  const { sidebarCollapsed, toggleSidebar, theme, toggleTheme } = useUIStore()
  const { badgeCounts } = useNotifications()
  const { open: openPalette } = useCommandPaletteStore()

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
      <div className={clsx(
        'flex h-16 items-center border-b border-border',
        sidebarCollapsed ? 'justify-center' : 'justify-between px-3'
      )}>
        {sidebarCollapsed ? (
          <button
            onClick={toggleSidebar}
            className="hover:opacity-80 transition-opacity"
            title="Expandir"
          >
            <Image src={theme === 'dark' ? '/iconoblanco.png' : '/icono.png'} alt="Pack-a-Stock" width={558} height={459} className="h-10 w-auto object-contain" />
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2.5 min-w-0">
              <Image src={theme === 'dark' ? '/iconoblanco.png' : '/icono.png'} alt="Pack-a-Stock" width={558} height={459} className="h-10 w-auto object-contain flex-shrink-0" />
              <span className="text-lg font-bold text-foreground tracking-tight truncate">Pack-a-Stock</span>
            </div>
            <button
              onClick={toggleSidebar}
              className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors flex-shrink-0"
              title="Colapsar"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`)
          const badge = badgeCounts[item.href] || 0
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
              <div className="relative flex-shrink-0">
                <item.icon className="h-5 w-5" />
                {badge > 0 && sidebarCollapsed && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </div>
              {!sidebarCollapsed && (
                <>
                  <span className="flex-1">{item.name}</span>
                  {badge > 0 && (
                    <span className={clsx(
                      'min-w-[20px] h-5 text-[10px] font-bold rounded-full flex items-center justify-center px-1.5 leading-none flex-shrink-0',
                      isActive
                        ? 'bg-white/25 text-white'
                        : 'bg-red-500 text-white'
                    )}>
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-4 space-y-2">
        {/* Command Palette trigger */}
        <button
          onClick={openPalette}
          className={clsx(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground w-full',
            sidebarCollapsed && 'justify-center'
          )}
          title="Buscar comandos (Ctrl+K)"
        >
          <Search className="h-5 w-5 flex-shrink-0" />
          {!sidebarCollapsed && (
            <>
              <span className="flex-1 text-left">Buscar...</span>
              <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
                Ctrl K
              </kbd>
            </>
          )}
        </button>

        {/* Notification Bell */}
        <NotificationBell sidebarMode sidebarCollapsed={sidebarCollapsed} />

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
