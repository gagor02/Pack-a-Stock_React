# Pack-a-Stock Frontend

Aplicación web administrativa para Pack-a-Stock - Sistema SaaS de gestión de inventarios y préstamos de materiales.

## 🎯 Descripción

Este es el **frontend web** para INVENTARISTAS (administradores). Los empleados utilizan una app móvil separada.

**Tecnologías:**
- Next.js 14+ (App Router)
- React 18 + TypeScript
- Tailwind CSS + Shadcn/ui
- TanStack Query (React Query)
- Zustand
- Axios

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 20+ 
- npm o yarn
- Backend API corriendo (Pack-a-Stock)

### Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con la URL de tu backend

# Ejecutar en desarrollo
npm run dev

# Abrir en navegador
# http://localhost:3000
```

### Variables de Entorno

Configurar en `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=Pack-a-Stock
```

Ver `.env.example` para todas las variables disponibles.

## 📁 Estructura del Proyecto

```
Front_End_SaaS/
├── app/                    # App Router de Next.js
│   ├── (auth)/            # Rutas de autenticación
│   └── (dashboard)/       # Rutas protegidas (inventaristas)
├── components/            # Componentes React
│   ├── ui/               # Componentes base (Shadcn)
│   ├── layout/           # Layout components
│   └── ...
├── lib/                   # Utilidades y configuración
│   ├── api.ts            # Cliente Axios
│   └── utils.ts
├── hooks/                 # Custom hooks
├── store/                 # Zustand stores
├── types/                 # TypeScript types
└── public/               # Archivos estáticos
```

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run dev

# Build de producción
npm run build

# Iniciar producción (después de build)
npm start

# Linting
npm run lint

# Type checking
npm run type-check
```

## 🐳 Docker

### Desarrollo

```bash
docker build -t packastock-frontend .
docker run -p 3000:3000 --env-file .env.local packastock-frontend
```

### Producción

Ver `Dockerfile` y `docker-compose.yml` para configuración de producción.

## 🔗 Conexión con Backend

El frontend se comunica con el backend Django a través de REST API:

- **Desarrollo:** `http://localhost:8000/api/`
- **Producción:** `https://api.tudominio.com/api/`

### Autenticación

- JWT tokens almacenados en localStorage
- Refresh token automático
- Middleware de Next.js para rutas protegidas

## 📱 Responsive Design

- ✅ Desktop (1920px+)
- ✅ Laptop (1366px)
- ✅ Tablet (768px)
- ✅ Mobile (375px)

## 🎨 UI Components

Usando **Shadcn/ui** para componentes base:

```bash
# Agregar componentes
npx shadcn-ui@latest add button
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add table
```

## 📝 Licencia

Privado - Pack-a-Stock © 2026

## 🤝 Contribuir

Este es un proyecto privado. Contacta al administrador para más información.

---

**Nota:** Este frontend es exclusivamente para inventaristas. Los empleados usan la app móvil.
