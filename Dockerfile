# Etapa 1: Construcción (Build) con Node.js
FROM node:18-alpine AS builder

WORKDIR /app

# Copiamos los archivos de dependencias
COPY package*.json ./
RUN npm install

# Copiamos el resto del código
COPY . .

# Variables de entorno (se deben pasar al hacer docker build)
ARG VITE_AIRTABLE_PAT
ARG VITE_AIRTABLE_BASE_ID
ARG VITE_N8N_WEBHOOK_URL

ENV VITE_AIRTABLE_PAT=$VITE_AIRTABLE_PAT
ENV VITE_AIRTABLE_BASE_ID=$VITE_AIRTABLE_BASE_ID
ENV VITE_N8N_WEBHOOK_URL=$VITE_N8N_WEBHOOK_URL

# Compilamos la aplicación React/Vite
RUN npm run build

# Etapa 2: Servidor web ligero con Nginx
FROM nginx:alpine

# Copiamos la configuración personalizada de Nginx para SPAs (Single Page Applications)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiamos los archivos compilados desde la etapa anterior
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
