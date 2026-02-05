FROM node:20-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci --legacy-peer-deps

# Copiar código fuente
COPY . .

# Build arguments (variables de entorno en build time)
ARG NEXT_PUBLIC_API_URL=http://localhost:8000/api
ARG NEXT_PUBLIC_APP_NAME=Pack-a-Stock

# Establecer como variables de entorno para el build
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME

# Build de producción
RUN npm run build

EXPOSE 3000

# Iniciar con npm start (producción)
CMD ["npm", "start"]
