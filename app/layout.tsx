import '@/app/globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Pack-a-Stock',
  description: 'Sistema de gestión de inventarios y préstamos',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Pack-a-Stock',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1a1625',
}

// Script inline que aplica el tema ANTES de que React hidrate,
// evitando el parpadeo de claro→oscuro en el primer render.
const themeScript = `
  try {
    var stored = localStorage.getItem('ui-storage')
    var theme = stored ? JSON.parse(stored).state?.theme : 'dark'
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  } catch(e) {
    document.documentElement.classList.add('dark')
  }
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Anti-FOUC: aplica el tema antes del primer render */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
