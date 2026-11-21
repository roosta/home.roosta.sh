FROM node:26-slim@sha256:e6bedef217677b276c591795e169840edd9096dbf13f29df8ef8d1856b8820bc AS build
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# keep in sync with packageManager in package.json
RUN npm install -g pnpm@12.21.0 \
 && pnpm install --frozen-lockfile

COPY . ./
RUN pnpm run build

FROM nginx:1.30.7-alpine3.24-slim@sha256:8c950211a641ec5b23f265450517001f6bcca533666120ebe36cb4cff3d00a55
COPY --from=build /app/dist /usr/share/nginx/html
