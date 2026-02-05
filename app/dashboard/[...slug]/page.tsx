import { redirect } from 'next/navigation'

const MAP: Record<string, string> = {
  materiales: '/materials',
  material: '/materials',
  categorias: '/categories',
  categoria: '/categories',
  ubicaciones: '/locations',
  ubicacion: '/locations',
  prestamos: '/loans',
  prestamo: '/loans',
  solicitudes: '/requests',
  solicitud: '/requests',
  usuarios: '/users',
  usuario: '/users',
  reportes: '/reports',
  reporte: '/reports',
  etiquetas: '/labels',
  etiqueta: '/labels',
  configuracion: '/settings',
  settings: '/settings',
}

export default function DashboardLegacyRedirect({
  params,
}: {
  params: { slug?: string[] }
}) {
  const key = params.slug?.[0]?.toLowerCase() || ''
  redirect(MAP[key] || '/dashboard')
}
