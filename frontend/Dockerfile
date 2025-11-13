# if anything fails, it's this guys' fault https://medium.com/@mohamedbenkhemiswork576/how-to-dockerize-a-react-app-with-multi-stage-build-and-nginx-minimize-react-image-size-by-80-33a09ae20118

# stage 1 i thin
FROM node:lts AS builder
WORKDIR /app
COPY package*.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

# stage 2 maybe?
FROM nginx:latest
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
