FROM node:26-slim@sha256:e6bedef217677b276c591795e169840edd9096dbf13f29df8ef8d1856b8820bc AS build
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# keep in sync with packageManager in package.json
RUN npm install -g pnpm@12.21.0 \
 && pnpm install --frozen-lockfile

COPY . ./
RUN pnpm run build

FROM nginx:1.31.8-alpine3.24-slim@sha256:4c734d33ee731135dc9f2349914a34551c920f4451fca8bb05bf5880eb9079e8
COPY --from=build /app/dist /usr/share/nginx/html
