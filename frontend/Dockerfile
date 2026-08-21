# React frontend — multi-stage build.
# NOTE: build with the repository root as context:
#   docker build -f frontend/Dockerfile -t niet-frontend .
# (docker-compose.yml does exactly this.)

FROM node:20-alpine AS build
WORKDIR /src/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./

# Base URLs are baked in at build time (Vite env vars).
# Defaults use the nginx path routes from deploy/nginx.conf.
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/proxy_params.conf /etc/nginx/proxy_params.conf
COPY --from=build /src/frontend/dist /usr/share/nginx/html

EXPOSE 80
