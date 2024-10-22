FROM node:20.18 AS build-deps
WORKDIR /usr/src/app
COPY . ./
RUN npm ci
RUN npm run build

# Nginx
FROM nginx:latest
COPY --from=build-deps /usr/src/app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
