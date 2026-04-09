'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useCommandPaletteStore } from '@/store/commandPaletteStore'
import { useAuthStore } from '@/store/authStore'
import {
  LayoutDashboard, Package, Tags, MapPin, ArrowLeftRight,
  Inbox, Users, BarChart3, Settings, QrCode, CreditCard,
  Search, FileText, X, ChevronRight, ShieldCheck, Printer,
  Moon, Sun, LogOut, Tv2,
} from 'lucide-react'
import { useUIStore } from '@/store/uiStore'

// ─── Command definitions ──────────────────────────────────────────────────────

type CommandGroup = 'Navegar' | 'Acciones' | 'Sistema'

interface Command {
  id: string
  label: string
  description?: string
  icon: React.ElementType
  group: CommandGroup
  roles?: string[]
  action: (ctx: CommandContext) => void
}

interface CommandContext {
  router: ReturnType<typeof useRouter>
  close: () => void
  toggleTheme: () => void
  logout: () => void
  setKioskMode: (on: boolean) => void
}

const ALL_COMMANDS: Command[] = [
  // ─ Navegar
  { id: 'dashboard', label: 'Dashboard', description: 'Ir al resumen general', icon: LayoutDashboard, group: 'Navegar', roles: ['inventarista', 'employee'], action: ({ router, close }) => { router.push('/dashboard'); close() } },
  { id: 'materials', label: 'Materiales', description: 'Ver catálogo de materiales', icon: Package, group: 'Navegar', roles: ['inventarista', 'employee'], action: ({ router, close }) => { router.push('/materials'); close() } },
  { id: 'categories', label: 'Categorías', description: 'Gestionar categorías', icon: Tags, group: 'Navegar', roles: ['inventarista'], action: ({ router, close }) => { router.push('/categories'); close() } },
  { id: 'locations', label: 'Ubicaciones', description: 'Ver y editar sedes', icon: MapPin, group: 'Navegar', roles: ['inventarista'], action: ({ router, close }) => { router.push('/locations'); close() } },
  { id: 'labels', label: 'Etiquetas QR', description: 'Imprimir etiquetas de materiales', icon: QrCode, group: 'Navegar', roles: ['inventarista'], action: ({ router, close }) => { router.push('/labels'); close() } },
  { id: 'requests', label: 'Solicitudes', description: 'Gestionar solicitudes de préstamo', icon: Inbox, group: 'Navegar', roles: ['inventarista'], action: ({ router, close }) => { router.push('/requests'); close() } },
  { id: 'loans', label: 'Préstamos', description: 'Ver préstamos activos', icon: ArrowLeftRight, group: 'Navegar', roles: ['inventarista', 'employee'], action: ({ router, close }) => { router.push('/loans'); close() } },
  { id: 'users', label: 'Usuarios', description: 'Administrar usuarios de la cuenta', icon: Users, group: 'Navegar', roles: ['inventarista'], action: ({ router, close }) => { router.push('/users'); close() } },
  { id: 'reports', label: 'Reportes', description: 'Ver estadísticas y exportar datos', icon: BarChart3, group: 'Navegar', roles: ['inventarista'], action: ({ router, close }) => { router.push('/reports'); close() } },
  { id: 'subscription', label: 'Suscripción', description: 'Ver tu plan actual', icon: CreditCard, group: 'Navegar', roles: ['inventarista', 'employee'], action: ({ router, close }) => { router.push('/subscription'); close() } },
  { id: 'settings', label: 'Configuración', description: 'Ajustes de la cuenta', icon: Settings, group: 'Navegar', roles: ['inventarista', 'employee'], action: ({ router, close }) => { router.push('/settings'); close() } },
  { id: 'admin', label: 'Panel de Administración', description: 'Acceso solo superusuarios', icon: ShieldCheck, group: 'Navegar', roles: ['superuser'], action: ({ router, close }) => { router.push('/admin'); close() } },
  // ─ Acciones
  { id: 'new-loan', label: 'Nuevo Préstamo', description: 'Crear un préstamo manual', icon: ArrowLeftRight, group: 'Acciones', roles: ['inventarista'], action: ({ router, close }) => { router.push('/loans/new'); close() } },
  { id: 'print-report', label: 'Exportar PDF', description: 'Ir a Reportes y exportar como PDF', icon: Printer, group: 'Acciones', roles: ['inventarista'], action: ({ router, close }) => { router.push('/reports?action=pdf'); close() } },
  { id: 'kiosk', label: 'Modo Kiosco', description: 'Pantalla completa para proyectar en TV', icon: Tv2, group: 'Acciones', roles: ['inventarista'], action: ({ setKioskMode, close }) => { setKioskMode(true); close() } },
  { id: 'print-labels', label: 'Imprimir Etiquetas QR', description: 'Ir a la sección de etiquetas', icon: FileText, group: 'Acciones', roles: ['inventarista'], action: ({ router, close }) => { router.push('/labels'); close() } },
  // ─ Sistema
  { id: 'toggle-theme', label: 'Cambiar tema', description: 'Alternar entre claro y oscuro', icon: Moon, group: 'Sistema', action: ({ toggleTheme, close }) => { toggleTheme(); close() } },
  { id: 'logout', label: 'Cerrar sesión', description: 'Salir de la cuenta', icon: LogOut, group: 'Sistema', action: ({ logout, close }) => { logout(); close() } },
]

// ─── Fuzzy match ──────────────────────────────────────────────────────────────
function matches(cmd: Command, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    cmd.label.toLowerCase().includes(q) ||
    (cmd.description?.toLowerCase().includes(q) ?? false) ||
    cmd.group.toLowerCase().includes(q)
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function CommandPalette() {
  const { isOpen, close } = useCommandPaletteStore()
  const { user, logout: storeLogout } = useAuthStore()
  const { toggleTheme, theme, setKioskMode } = useUIStore()
  const router = useRouter()

  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const userType = (user as any)?.user_type ?? 'employee'
  const isSuperuser = (user as any)?.is_superuser ?? false

  const filtered = ALL_COMMANDS.filter((cmd) => {
    if (cmd.roles) {
      if (cmd.roles.includes('superuser') && !isSuperuser) return false
      if (!cmd.roles.includes('superuser') && !cmd.roles.includes(userType) && !isSuperuser) return false
    }
    return matches(cmd, query)
  })

  const groups: CommandGroup[] = ['Navegar', 'Acciones', 'Sistema']

  const ctx: CommandContext = {
    router,
    close,
    toggleTheme,
    logout: () => { storeLogout(); router.push('/login'); close() },
    setKioskMode,
  }

  const runCommand = useCallback(
    (cmd: Command) => cmd.action(ctx),
    [router, close]
  )

  // Focus input when open
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setActiveIdx(0)
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [isOpen])

  // Keyboard nav
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close(); return }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx((i) => Math.min(i + 1, filtered.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx((i) => Math.max(i - 1, 0))
      }
      if (e.key === 'Enter' && filtered[activeIdx]) {
        e.preventDefault()
        runCommand(filtered[activeIdx])
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, filtered, activeIdx, runCommand, close])

  // Reset active when filtered list changes
  useEffect(() => setActiveIdx(0), [query])

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector(`[data-idx="${activeIdx}"]`) as HTMLElement
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  if (!isOpen) return null

  let globalIdx = 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Palette */}
      <div className="relative w-full max-w-xl bg-card border-2 border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[60vh]">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar o ejecutar un comando..."
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm outline-none"
          />
          <button
            onClick={close}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto flex-1 py-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Search className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">Sin resultados para &quot;{query}&quot;</p>
            </div>
          ) : (
            groups.map((group) => {
              const cmds = filtered.filter((c) => c.group === group)
              if (cmds.length === 0) return null
              return (
                <div key={group}>
                  <div className="px-4 py-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {group}
                    </span>
                  </div>
                  {cmds.map((cmd) => {
                    const idx = globalIdx++
                    const isActive = idx === activeIdx
                    return (
                      <button
                        key={cmd.id}
                        data-idx={idx}
                        onMouseEnter={() => setActiveIdx(idx)}
                        onClick={() => runCommand(cmd)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-foreground hover:bg-muted/50'
                        }`}
                      >
                        <div
                          className={`p-1.5 rounded-lg ${
                            isActive ? 'bg-primary/20' : 'bg-muted'
                          }`}
                        >
                          <cmd.icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {cmd.label}
                          </div>
                          {cmd.description && (
                            <div className="text-xs text-muted-foreground truncate">
                              {cmd.description}
                            </div>
                          )}
                        </div>
                        {isActive && (
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-xs text-muted-foreground bg-muted/30">
          <span><kbd className="px-1.5 py-0.5 rounded border border-border bg-card font-mono text-[10px]">↑↓</kbd> navegar</span>
          <span><kbd className="px-1.5 py-0.5 rounded border border-border bg-card font-mono text-[10px]">↵</kbd> ejecutar</span>
          <span><kbd className="px-1.5 py-0.5 rounded border border-border bg-card font-mono text-[10px]">Esc</kbd> cerrar</span>
          <span className="ml-auto opacity-60">Pack-a-Stock</span>
        </div>
      </div>
    </div>
  )
}
