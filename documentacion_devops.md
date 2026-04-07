# Documentación Técnica — Pack-a-Stock
## Universidad Tecnológica de Tijuana | Tecnologías de Información
### Gestión de Procesos de Software y DevOps

**Proyecto:** Pack-a-Stock — Sistema de Gestión de Préstamos de Materiales y Equipos  
**Departamento:** Tecnologías de Información  
**Institución:** Universidad Tecnológica de Tijuana (UTT)  
**Fecha:** Abril 2026

---

## PARTE 1: Planeación y Fundamentos DevOps

### Resumen Ejecutivo

Pack-a-Stock es un sistema integral de gestión de préstamos de materiales y equipos, desarrollado para optimizar el proceso de solicitud, aprobación y seguimiento de préstamos en organizaciones que administran inventarios físicos. El sistema consta de tres componentes principales: una API REST construida con Django, una interfaz web desarrollada en Next.js 15, y una aplicación móvil Android construida con Flutter. Todo el ecosistema se despliega mediante contenedores Docker gestionados con docker-compose, bajo una infraestructura segura en un servidor Ubuntu 24.04 LTS.

La implementación sigue principios DevOps modernos, utilizando Jenkins como servidor de integración y entrega continua, con pipelines automatizados que se activan por cambios en los repositorios de GitHub. El resultado es un ciclo de desarrollo ágil donde los cambios en el código se validan, construyen y despliegan en producción de forma confiable y repetible.

### Problemática, Motivación e Importancia

En muchas organizaciones, la gestión de préstamos de equipos y materiales se realiza de forma manual: hojas de papel, hojas de cálculo o sistemas improvisados que generan inconsistencias, pérdidas de material y procesos lentos. El personal de almacén (inventaristas) dedica tiempo excesivo a tareas administrativas, mientras que los empleados que solicitan préstamos enfrentan procesos poco claros y sin trazabilidad.

La motivación principal de Pack-a-Stock es resolver esta problemática mediante digitalización completa del flujo: los empleados escanean códigos QR en los materiales usando la app móvil, seleccionan fechas y horas de recolección y devolución, y envían solicitudes que los inventaristas aprueban o rechazan desde el panel web. Cada solicitud queda registrada con un token QR único que sirve como comprobante.

La importancia del proyecto radica en que, además de resolver el problema funcional, sirve como caso de estudio real de implementación DevOps: desde el control de versiones hasta el monitoreo en producción, aplicando las mejores prácticas de la industria dentro de un contexto académico.

### ¿Qué es DevOps y por qué se aplica en el proyecto?

DevOps es una cultura y conjunto de prácticas que integran el desarrollo de software (Dev) con las operaciones de sistemas (Ops), con el objetivo de acortar el ciclo de vida del desarrollo, aumentar la frecuencia de despliegues y mejorar la confiabilidad del software. Sus pilares fundamentales son la automatización, la colaboración, la entrega continua y el monitoreo constante.

En Pack-a-Stock, DevOps se aplica porque el proyecto involucra múltiples componentes (backend, frontend, mobile), múltiples repositorios y un equipo de desarrollo distribuido. Sin automatización, cada despliegue requeriría intervención manual propensa a errores. Con Jenkins gestionando los pipelines, un commit en la rama correcta dispara automáticamente la construcción y el despliegue, reduciendo el tiempo de entrega de horas a minutos y eliminando inconsistencias entre entornos.

### Objetivos

**Objetivo General:**
Diseñar, desarrollar y desplegar un sistema de gestión de préstamos de materiales y equipos aplicando metodologías y herramientas DevOps, logrando un ciclo de integración y entrega continua funcional en un entorno de producción real.

**Objetivos Específicos:**
- Implementar control de versiones con Git y GitHub utilizando una estrategia de ramas definida para separar desarrollo de producción.
- Configurar un servidor Jenkins con pipelines automatizados para backend y frontend que detecten cambios cada minuto mediante pollSCM.
- Contenerizar todos los componentes del sistema (base de datos, backend, frontend, CI/CD) usando Docker y docker-compose.
- Aplicar medidas de seguridad en el servidor de producción: firewall UFW, Fail2Ban, autenticación SSH por llaves, HTTPS con TLS 1.2/1.3 y HSTS.
- Implementar respaldos automáticos diarios de la base de datos PostgreSQL con retención de 7 días.
- Documentar el proceso completo como referencia técnica reproducible.

### Alcance del Proyecto

El proyecto abarca:
- Desarrollo completo del backend REST (autenticación JWT, gestión de materiales, préstamos, suscripciones, panel administrativo).
- Desarrollo de la interfaz web para inventaristas y administradores.
- Desarrollo de la aplicación móvil Android para empleados.
- Infraestructura de producción en servidor VPS Ubuntu 24.04 LTS.
- Pipeline CI/CD con Jenkins para backend y frontend.
- Seguridad del servidor y de los contenedores.
- Monitoreo básico mediante herramientas nativas de Docker y del sistema operativo.

Fuera del alcance: aplicación iOS, notificaciones push en producción, integración con sistemas ERP externos.

### Descripción General del Sistema

Pack-a-Stock implementa un modelo multi-tenant basado en cuentas (Account), donde cada organización suscrita tiene sus propios usuarios, materiales y préstamos. Los roles del sistema son:

- **Administrador (superuser):** Gestiona cuentas, planes de suscripción y pagos desde el panel `/admin`.
- **Inventarista:** Gestiona el catálogo de materiales, aprueba o rechaza solicitudes de préstamo desde la interfaz web.
- **Empleado:** Solicita préstamos escaneando códigos QR con la app Flutter, selecciona fechas/horas y consulta el estado de sus solicitudes.

Cada material tiene un código QR único. Al escanearlo, la app recupera los detalles del material y permite al empleado agregar la cantidad deseada a su carrito de solicitud. La solicitud resultante (`LoanRequest`) contiene un arreglo de ítems (`items`) con referencias al material y cantidades, más un `qr_token` único generado en la creación para su verificación física.

---

## PARTE 2: Diseño del Flujo DevOps y Arquitectura

### Flujo de Trabajo DevOps (Pipeline Completo)

El flujo DevOps de Pack-a-Stock sigue el ciclo clásico de ocho fases adaptado al contexto del proyecto:

**Plan → Code → Build → Test → Release → Deploy → Operate → Monitor**

El equipo planifica funcionalidades en reuniones cortas, los desarrolladores escriben código en sus ramas de trabajo (`v02` para backend, `xd` para frontend), Jenkins detecta los cambios automáticamente, construye y valida los artefactos, y los despliega en el servidor de producción. El monitoreo se realiza con herramientas del sistema operativo y Docker.

### Fases del Ciclo DevOps

| Fase | Herramienta / Actividad |
|------|------------------------|
| Code | Git + GitHub, ramas separadas por componente |
| Build | Docker build, npm run build (Next.js standalone) |
| Test | Health check HTTP, verificación de contenedor activo |
| Release | Imagen Docker etiquetada, archivos standalone sincronizados |
| Deploy | docker-compose up --build, rsync/sftp al servidor |
| Operate | Gunicorn (backend), Node.js standalone (frontend) |
| Monitor | docker stats, docker logs, fail2ban-client, nginx logs |

### Herramientas Seleccionadas

| Categoría | Herramienta | Justificación |
|-----------|-------------|---------------|
| Lenguaje Backend | Python 3.12 + Django REST Framework | Maduro, rápido de desarrollar, excelente ORM |
| Lenguaje Frontend | TypeScript + Next.js 15 | SSR, rendimiento, ecosistema React |
| Mobile | Flutter (Dart) | Multiplataforma, rendimiento nativo |
| Base de datos | PostgreSQL 16 | Robusto, soporte multi-tenant, respaldos confiables |
| Contenedores | Docker + docker-compose | Portabilidad, aislamiento, reproducibilidad |
| CI/CD | Jenkins LTS | Extensible, self-hosted, pipelines como código |
| Servidor web | Nginx (reverse proxy) | Termination SSL, rate limiting, cabeceras de seguridad |
| Firewall | UFW + Fail2Ban | Protección a nivel OS y detección de intrusos |
| Certificados SSL | Let's Encrypt + nip.io | HTTPS gratuito sin dominio propio |
| Control de versiones | Git + GitHub | Estándar de la industria, integración con Jenkins |

### Diseño de Arquitectura del Sistema

El sistema sigue una arquitectura de microservicios contenedorizados detrás de un proxy inverso Nginx:

- El cliente web (navegador) y la app móvil se comunican con Nginx en el puerto 443 (HTTPS).
- Nginx enruta las peticiones `/api/*` al contenedor `pack_backend` (Django + Gunicorn, puerto 8000 interno).
- Las peticiones a la raíz se enrutan al contenedor `pack_frontend` (Next.js standalone, puerto 3000 interno).
- El backend se comunica con `pack_db` (PostgreSQL, puerto 5432 interno) en la red Docker interna.
- Jenkins (`pack_jenkins`, puerto 8080 interno, expuesto en subdominio propio) monitorea los repositorios y ejecuta los pipelines de despliegue.

### Diagrama de Pipeline CI/CD (ASCII)

```
GitHub (rama v02 / xd)
        |
        | (pollSCM cada 1 minuto)
        v
+--------------------+
|   Jenkins Pipeline  |
|                    |
|  1. Checkout       |  <-- git clone/pull del repo
|  2. Copy/Build     |  <-- rsync archivos al servidor /
|                    |      npm run build (frontend)
|  3. Deploy         |  <-- docker-compose up --build
|  4. Health Check   |  <-- curl HTTP 200 verification
+--------------------+
        |
        v
Servidor Producción (198.71.54.179)
  /root/pack-a-stock-prod/
  |- Pack-a-Stock/          (backend)
  |- Pack-a-Stock_React/    (frontend)
  |- docker-compose.yml
```

### Diagrama de Arquitectura General (ASCII)

```
Internet
   |
   | HTTPS :443 / :80
   v
+------------------+
|      Nginx       |  (reverse proxy + SSL termination)
|  nip.io certs    |  UFW: solo puertos 22, 80, 443
+------------------+
   |          |
   | /api/*   | /*
   v          v
+--------+ +----------+
| pack_  | | pack_    |
|backend | |frontend  |
|Django  | |Next.js   |
|:8000   | |:3000     |
+--------+ +----------+
   |
   | (red interna Docker)
   v
+----------+
|  pack_db |
|PostgreSQL|
|   :5432  |
+----------+

+------------+
|pack_jenkins|  (subdominio jenkins.nip.io)
|Jenkins LTS |
|   :8080    |
+------------+

Dispositivos Cliente:
[Navegador Web] --HTTPS--> Nginx --> Frontend/Backend
[App Flutter]   --HTTPS--> Nginx --> Backend API
```

---

## PARTE 3: Gestión del Código y Control de Versiones

### Creación y Configuración del Repositorio

El proyecto utiliza dos repositorios públicos en GitHub:

- **Backend:** `https://github.com/Nyels1/Pack-a-Stock` — contiene el proyecto Django, Dockerfiles, scripts de administración y migraciones de base de datos.
- **Frontend Web:** `https://github.com/gagor02/Pack-a-Stock_React` — contiene el proyecto Next.js, configuraciones de Tailwind, y el Dockerfile de producción.

La aplicación Flutter se mantiene en el directorio `Pack_a_stock/` como parte del repositorio de equipo local. Los repositorios están configurados con acceso público para facilitar la integración con Jenkins sin necesidad de credenciales SSH adicionales.

### Estrategia de Ramas

| Rama | Repositorio | Propósito |
|------|-------------|-----------|
| `main` | Ambos | Rama estable protegida, refleja el estado de producción anterior |
| `v02` | Backend | Rama de desarrollo activo del backend; Jenkins monitorea esta rama |
| `xd` | Frontend | Rama de desarrollo activo del frontend; Jenkins monitorea esta rama |
| `ernestoggpapa` | Backend/Frontend | Rama de experimentos y funcionalidades en progreso |

El flujo de trabajo consiste en desarrollar en las ramas de trabajo (`v02`, `xd`), y una vez estabilizada la funcionalidad, se integra a `main` mediante Pull Request revisado por al menos un miembro del equipo.

### Convenciones de Commits

El equipo sigue una convención de mensajes descriptivos en español e inglés, con prefijos que indican el tipo de cambio:

- `feat:` — Nueva funcionalidad
- `fix:` — Corrección de errores
- `refactor:` — Refactorización sin cambio funcional
- `docs:` — Documentación
- `chore:` — Tareas de mantenimiento (dependencias, configuraciones)
- `deploy:` — Cambios relacionados con infraestructura o despliegue

Ejemplo: `feat: agregar campo qr_token a LoanRequest con uuid4 por defecto`

### Uso de Pull Requests

Los Pull Requests se utilizan para integrar cambios significativos de ramas de trabajo a `main`. Cada PR incluye una descripción del cambio, referencia al issue o tarea relacionada, y requiere revisión de al menos un colaborador antes del merge. Esto garantiza que el código en `main` haya pasado por al menos una revisión de pares.

### Evidencia del Control de Versiones

El historial de commits de ambos repositorios refleja el desarrollo iterativo del proyecto: desde la configuración inicial del proyecto Django y Next.js, pasando por la implementación del modelo de datos multi-tenant, hasta las últimas funcionalidades de gestión de préstamos y el panel administrativo. Las ramas `v02` y `xd` contienen el historial completo de la Fase 2 de implementación.

---

## PARTE 4: Integración y Entrega Continua (CI/CD)

### Configuración del Pipeline CI/CD en Jenkins

Jenkins se ejecuta como contenedor Docker (`pack_jenkins`) en el mismo servidor de producción, accesible en `https://jenkins.198.71.54.179.nip.io`. La instancia de Jenkins está configurada con:

- **Plugins instalados:** Git, Pipeline, SSH Agent, Blue Ocean (visualización).
- **Credenciales:** Llave SSH del servidor para ejecutar comandos remotos y copiar archivos.
- **Dos pipelines:** uno para el backend (repositorio `Pack-a-Stock`, rama `v02`) y uno para el frontend (repositorio `Pack-a-Stock_React`, rama `xd`).

### Fases del Pipeline

Ambos pipelines siguen la misma secuencia de cinco fases:

**1. Checkout:** Jenkins clona o actualiza el repositorio desde GitHub. Usando el plugin de Git, obtiene la última versión de la rama configurada.

**2. Copy / Build:** 
- *Backend:* Los archivos del proyecto Django se copian al directorio `/root/pack-a-stock-prod/Pack-a-Stock/` en el servidor mediante rsync o sftp.
- *Frontend:* Se ejecuta `npm run build` localmente en el agente Jenkins para generar el directorio `.next/standalone`. Luego los archivos compilados se transfieren al servidor para evitar que el proceso de build agote la memoria RAM del VPS (4GB).

**3. Deploy:** Se ejecuta `docker-compose up -d --build` en el servidor para el servicio correspondiente (backend o frontend). Docker construye una nueva imagen usando los archivos actualizados y reinicia el contenedor.

**4. Health Check:** El pipeline ejecuta un `curl` al endpoint de salud del servicio desplegado y verifica que responda con HTTP 200. Si la respuesta falla, el pipeline marca la ejecución como fallida y notifica al equipo.

### Descripción de los Jenkinsfiles

**Backend Jenkinsfile:**
```groovy
pipeline {
  agent any
  triggers { pollSCM('* * * * *') }
  stages {
    stage('Checkout') { steps { git branch: 'v02', url: '...' } }
    stage('Copy') { steps { /* rsync/sftp archivos al servidor */ } }
    stage('Deploy') { steps { sh 'ssh servidor docker compose restart backend' } }
    stage('Health') { steps { sh 'curl -f https://packstock.198.71.54.179.nip.io/api/health/' } }
  }
}
```

**Frontend Jenkinsfile:**
```groovy
pipeline {
  agent any
  triggers { pollSCM('* * * * *') }
  stages {
    stage('Checkout') { steps { git branch: 'xd', url: '...' } }
    stage('Build') { steps { sh 'npm ci && npm run build' } }
    stage('Copy') { steps { /* sftp .next/standalone y .next/static al servidor */ } }
    stage('Deploy') { steps { sh 'ssh servidor docker compose up -d --build frontend' } }
    stage('Health') { steps { sh 'curl -f https://packstock.198.71.54.179.nip.io/' } }
  }
}
```

### Automatización con pollSCM

Ambos pipelines utilizan el trigger `pollSCM('* * * * *')`, que indica a Jenkins que consulte el repositorio de GitHub cada minuto. Si detecta nuevos commits en la rama configurada, dispara automáticamente la ejecución del pipeline. Esto garantiza que los cambios de código lleguen a producción en un máximo de 1 minuto después del push, sin intervención manual.

### Ambientes

| Ambiente | Descripción |
|----------|-------------|
| **Desarrollo local** | Cada desarrollador ejecuta el backend con `python manage.py runserver` y el frontend con `npm run dev`. La base de datos puede ser SQLite (desarrollo) o PostgreSQL local. |
| **Producción** | Servidor Ubuntu 24.04 LTS en IP `198.71.54.179`. Todos los componentes corren en contenedores Docker. HTTPS habilitado. Configuración de entorno en `.env.production`. |

---

## PARTE 5: Contenedores, Seguridad y Automatización

### Contenedores Docker

El sistema utiliza cuatro contenedores gestionados con docker-compose:

| Contenedor | Imagen Base | Puerto Interno | Descripción |
|------------|-------------|----------------|-------------|
| `pack_db` | postgres:16 | 5432 | Base de datos PostgreSQL. Volumen persistente para datos. |
| `pack_backend` | python:3.12-slim | 8000 | Django + Gunicorn. Sirve la API REST. |
| `pack_frontend` | node:20-alpine | 3000 | Next.js en modo standalone. Sirve la interfaz web. |
| `pack_jenkins` | jenkins/jenkins:lts | 8080 | Servidor CI/CD. Volumen persistente para configuración y jobs. |

Todos los contenedores están conectados a una red Docker interna (`pack_network`) de tipo bridge. Solo Nginx en el host expone puertos al exterior (80 y 443).

### Descripción de Dockerfiles

**Backend (`Dockerfile`):**
Parte de la imagen `python:3.12-slim`, instala dependencias del sistema (libpq para PostgreSQL), copia `requirements.txt` e instala dependencias Python, copia el código fuente, recolecta archivos estáticos con `collectstatic`, y define como comando de inicio `gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3`.

**Frontend (`Dockerfile.prod`):**
Parte de `node:20-alpine`. Dado que el build de Next.js se realiza en el agente Jenkins, el Dockerfile simplemente copia los archivos pre-compilados del directorio `.next/standalone` y `.next/static`, y ejecuta `node server.js`. Esto evita instalar `node_modules` en el servidor, lo que causaría errores de memoria (OOM) en el VPS de 4GB.

### docker-compose

El archivo `docker-compose.yml` en `/root/pack-a-stock-prod/` define:
- Servicios con sus respectivas imágenes o rutas de Dockerfile.
- Variables de entorno cargadas desde archivos `.env`.
- Límites de recursos (`mem_limit: 512m` para backend, `mem_limit: 256m` para la base de datos) para evitar que un contenedor monopolice la memoria del servidor.
- Volúmenes nombrados para persistencia de datos de PostgreSQL y configuración de Jenkins.
- Red interna para comunicación entre contenedores sin exposición al exterior.

### Seguridad en el Servidor

**UFW (Uncomplicated Firewall):**
Configurado para permitir únicamente tráfico en los puertos 22 (SSH), 80 (HTTP, redirige a HTTPS) y 443 (HTTPS). Todo el tráfico entrante en otros puertos es bloqueado por defecto.

**Fail2Ban:**
Instalado con dos jails activos:
- `sshd`: Banea IPs que realizan más de 5 intentos de autenticación SSH fallidos en 10 minutos. Tiempo de baneo: 1 hora.
- `nginx-http-auth`: Detecta ataques de fuerza bruta a través del proxy Nginx.

**SSH Hardening:**
Autenticación por contraseña deshabilitada (`PasswordAuthentication no`). Solo se permite acceso mediante llave SSH Ed25519. El acceso al servidor requiere la llave privada almacenada en `/c/Users/el_ti/.ssh/ionos_ed25519`.

**HTTPS con Let's Encrypt:**
Certificados TLS generados con Certbot para el dominio `*.198.71.54.179.nip.io`. Nginx está configurado para:
- Redirigir todo el tráfico HTTP a HTTPS.
- Usar solo TLS 1.2 y 1.3.
- Incluir cabecera `Strict-Transport-Security` (HSTS) con `max-age=31536000`.
- Rate limiting: máximo 10 requests por segundo por IP para prevenir abuso de la API.

**Actualizaciones de seguridad automatizadas:**
`unattended-upgrades` configurado para aplicar parches de seguridad del sistema operativo automáticamente.

**Swap:**
2GB de swap configurado para manejar picos de memoria sin causar OOM-killer en los procesos críticos.

### Seguridad en Contenedores

- Todos los contenedores corren con usuarios no-root donde es posible.
- La red Docker interna (`pack_network`) impide que los contenedores sean accesibles directamente desde el exterior.
- Las variables de entorno con credenciales (contraseña de base de datos, `SECRET_KEY` de Django) se pasan mediante archivos `.env` no versionados en git (listados en `.gitignore`).
- Límites de memoria y CPU definidos en `docker-compose.yml` para evitar que un contenedor comprometa la disponibilidad del servidor.

### Respaldos Automáticos de PostgreSQL

Un script de cron ejecuta diariamente a las 3:00 AM un respaldo de la base de datos:

```bash
# /root/backup_db.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/root/backups"
docker exec pack_db pg_dump -U postgres pack_stock_db > \
  "$BACKUP_DIR/backup_$DATE.sql"
# Eliminar respaldos con más de 7 días
find "$BACKUP_DIR" -name "backup_*.sql" -mtime +7 -delete
```

Entrada en crontab: `0 3 * * * /root/backup_db.sh >> /var/log/backup_db.log 2>&1`

Los respaldos se almacenan en `/root/backups/` con retención de 7 días. En caso de fallo, los errores quedan registrados en `/var/log/backup_db.log`.

---

## PARTE 6: Monitoreo, Pruebas y Documentación Final

### Monitoreo del Sistema

**docker stats:** Permite visualizar en tiempo real el uso de CPU, memoria y red de todos los contenedores activos:
```bash
docker stats pack_db pack_backend pack_frontend pack_jenkins
```

**docker logs:** Acceso a los logs de cada contenedor para diagnóstico:
```bash
docker logs -f pack_backend    # Logs en tiempo real del backend
docker logs --tail 100 pack_frontend
```

**Fail2Ban:** Monitoreo de intentos de intrusión:
```bash
fail2ban-client status sshd
fail2ban-client status nginx-http-auth
```

**Nginx access logs:** En `/var/log/nginx/access.log` y `error.log`, útiles para detectar patrones de tráfico anómalos o errores de proxy.

### Logs del Sistema

| Log | Ubicación | Contenido |
|-----|-----------|-----------|
| Nginx acceso | `/var/log/nginx/access.log` | Todas las peticiones HTTP/HTTPS |
| Nginx errores | `/var/log/nginx/error.log` | Errores de proxy y TLS |
| Django/Gunicorn | `docker logs pack_backend` | Errores de aplicación, peticiones API |
| PostgreSQL | `docker logs pack_db` | Conexiones, errores de BD |
| Jenkins | `docker logs pack_jenkins` | Ejecuciones de pipelines |
| Respaldos BD | `/var/log/backup_db.log` | Resultado de respaldos diarios |
| Fail2Ban | `/var/log/fail2ban.log` | Baneos y liberaciones de IP |

### Pruebas Funcionales del Sistema

**Prueba 1 — Inicio de sesión (web):**
Un inventarista accede a `https://packstock.198.71.54.179.nip.io`, ingresa credenciales. El sistema valida con el backend, genera tokens JWT (access + refresh), los almacena en localStorage y redirige al dashboard. Resultado: exitoso, redirección correcta.

**Prueba 2 — Escaneo de QR (app móvil):**
El empleado abre la app Flutter, navega a la pantalla de escaneo, apunta la cámara al código QR impreso en un equipo. La app envía el `qr_code` al endpoint `/api/materials/materials/search_by_qr/`, recibe los detalles del material y lo agrega al carrito de solicitud. Resultado: material identificado correctamente.

**Prueba 3 — Solicitud de préstamo (app móvil):**
Con ítems en el carrito, el empleado selecciona fecha y hora de recolección, y fecha y hora de devolución. Envía la solicitud al endpoint `POST /api/loans/loan-requests/` con el body `{desired_pickup_date, items: [...]}`. El backend crea el `LoanRequest` con un `qr_token` único. Resultado: solicitud creada, ID y QR token devueltos.

**Prueba 4 — Aprobación de solicitud (web):**
El inventarista ve la solicitud pendiente en el panel web, revisa los detalles y hace clic en "Aprobar". El backend actualiza el estado de la `LoanRequest`. El empleado puede verificar el estado actualizado desde la app. Resultado: estado actualizado correctamente.

**Prueba 5 — Panel administrativo:**
El superusuario accede a `/admin`, gestiona cuentas de organizaciones, asigna planes de suscripción y revisa el historial de pagos. Resultado: todas las operaciones CRUD funcionan correctamente.

### Resultados y Evidencias

Los pipelines de Jenkins muestran estado **BUILD SUCCESS** para ambos componentes tras cada deploy. La consola de Jenkins registra cada fase completada con su duración. El endpoint de health del backend responde `HTTP 200` con `{"status": "ok"}`. El frontend carga correctamente con todos los estilos y funcionalidades activas en producción.

### Documentación de Instalación (Resumen)

Para reproducir el entorno de producción en un servidor nuevo Ubuntu 24.04 LTS:

1. Instalar Docker y docker-compose.
2. Clonar ambos repositorios en `/root/pack-a-stock-prod/`.
3. Crear archivos `.env` con variables de entorno (credenciales BD, `SECRET_KEY`, URLs).
4. Instalar y configurar Nginx con los bloques de servidor para los subdominios.
5. Obtener certificados SSL: `certbot --nginx -d packstock.198.71.54.179.nip.io -d jenkins.198.71.54.179.nip.io`.
6. Configurar UFW: `ufw allow 22,80,443/tcp && ufw enable`.
7. Instalar Fail2Ban y copiar configuración de jails.
8. Ejecutar `docker-compose up -d` para levantar todos los servicios.
9. Ejecutar migraciones: `docker exec pack_backend python manage.py migrate`.
10. Configurar cron para respaldos automáticos.
11. Configurar Jenkins con los dos pipelines.

### Conclusiones de la Parte 6

El sistema funciona de manera estable en producción. La combinación de Docker, Jenkins y Nginx proporciona un entorno robusto donde los despliegues son predecibles y los errores son detectables rápidamente mediante los logs centralizados. Las pruebas funcionales validaron todos los flujos principales del sistema, confirmando la integridad entre los tres componentes (backend, frontend y app móvil).

---

## PARTE 7: Conclusiones y Referencias

### Conclusiones sobre DevOps Aplicado al Proyecto

La implementación de DevOps en Pack-a-Stock demostró que la automatización no es un lujo exclusivo de grandes empresas, sino una necesidad práctica incluso en proyectos académicos de mediana escala. Las principales lecciones aprendidas son:

**La automatización del despliegue elimina el error humano.** Antes de implementar Jenkins, los despliegues manuales eran lentos y propensos a inconsistencias: se olvidaba ejecutar migraciones, se subían archivos incorrectos, o se reiniciaban los servicios en el orden equivocado. Con el pipeline automatizado, cada despliegue sigue exactamente los mismos pasos en el mismo orden.

**Los contenedores Docker hacen que "funciona en mi máquina" sea historia.** Al definir el entorno de ejecución en archivos Dockerfile y docker-compose, todo el equipo trabaja con exactamente las mismas versiones de Python, Node.js y PostgreSQL, tanto en desarrollo como en producción.

**La seguridad debe diseñarse desde el inicio, no agregarse al final.** Configurar UFW, Fail2Ban y HTTPS desde el primer día del servidor en producción evitó incidentes: los logs de Fail2Ban muestran docenas de intentos de acceso SSH bloqueados cada semana. Un servidor expuesto sin estas medidas habría sido comprometido rápidamente.

**El monitoreo es tan importante como el desarrollo.** Los comandos `docker logs` y `docker stats` se convirtieron en herramientas de diagnóstico cotidianas. Sin ellos, investigar un error en producción habría sido extremadamente difícil.

**DevOps es cultura antes que herramientas.** Las herramientas (Jenkins, Docker, Git) son el medio, no el fin. Lo que realmente transforma el equipo es la mentalidad de colaboración, documentación y mejora continua que DevOps promueve.

**Mejoras futuras identificadas:**
- Implementar pruebas automatizadas (unit tests, integration tests) dentro del pipeline para garantizar calidad antes del despliegue.
- Agregar Prometheus + Grafana para monitoreo visual de métricas en tiempo real.
- Implementar un sistema de notificaciones (Slack, email) cuando un pipeline falla.
- Configurar múltiples ambientes (staging, producción) con promoción de artefactos entre ellos.
- Implementar secrets management con HashiCorp Vault para gestión segura de credenciales.
- Habilitar notificaciones push reales en la app Flutter mediante Firebase Cloud Messaging.

### Referencias

Django Software Foundation. (2024). *Django documentation — Version 5.0*. https://docs.djangoproject.com/en/5.0/

Django REST Framework. (2024). *Django REST framework documentation*. https://www.django-rest-framework.org/

Vercel. (2024). *Next.js 15 documentation*. https://nextjs.org/docs

Google LLC. (2024). *Flutter documentation*. https://docs.flutter.dev/

Docker Inc. (2024). *Docker Engine documentation*. https://docs.docker.com/engine/

Docker Inc. (2024). *Docker Compose documentation*. https://docs.docker.com/compose/

Jenkins Project. (2024). *Jenkins user documentation — Pipeline syntax*. https://www.jenkins.io/doc/book/pipeline/syntax/

PostgreSQL Global Development Group. (2024). *PostgreSQL 16 documentation*. https://www.postgresql.org/docs/16/

Let's Encrypt. (2024). *Let's Encrypt documentation — Certbot*. https://letsencrypt.org/docs/

Canonical Ltd. (2024). *Ubuntu 24.04 LTS server guide*. https://ubuntu.com/server/docs

Nginx Inc. (2024). *Nginx documentation — Reverse proxy*. http://nginx.org/en/docs/

fail2ban Project. (2024). *Fail2Ban documentation*. https://www.fail2ban.org/wiki/index.php/Main_Page

Kim, G., Debois, P., Willis, J., & Humble, J. (2016). *The DevOps Handbook: How to Create World-Class Agility, Reliability, and Security in Technology Organizations*. IT Revolution Press.

Humble, J., & Farley, D. (2010). *Continuous Delivery: Reliable Software Releases through Build, Test, and Deployment Automation*. Addison-Wesley.

---

*Documentación elaborada para la materia Gestión de Procesos de Software y DevOps*  
*Universidad Tecnológica de Tijuana — Departamento de Tecnologías de Información*  
*Abril 2026*
