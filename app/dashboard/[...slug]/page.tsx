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
  solicitudes: '/loans',
  solicitud: '/loans',
  usuarios: '/users',
  usuario: '/users',
  reportes: '/reports',
  reporte: '/reports',
  etiquetas: '/labels',
  etiqueta: '/labels',
  configuracion: '/settings',
  settings: '/settings',
}

export default async function DashboardLegacyRedirect({
  params,
}: {
  params: Promise<{ slug?: string[] }>
}) {
  const { slug } = await params
  const key = slug?.[0]?.toLowerCase() || ''
  redirect(MAP[key] || '/dashboard')
}
