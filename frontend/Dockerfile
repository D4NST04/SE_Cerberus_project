# jak cos nie dziala, to teraz jest moja wina lmao

# --- STAGE 1: Budowanie (Build) ---
FROM node:lts AS builder
WORKDIR /app

# ZMIANA: Kopiujemy package.json ORAZ yarn.lock
COPY package.json yarn.lock ./

# ZMIANA: Instalujemy zależności używając Yarna
# --frozen-lockfile oznacza: "nie zmieniaj wersji, instaluj dokładnie to co w yarn.lock"
RUN yarn install --frozen-lockfile

# Kopiujemy resztę plików
COPY . .

# ZMIANA: Budujemy projekt Yarnem
RUN yarn build

# --- STAGE 2: Serwowanie (Nginx) ---
FROM nginx:alpine

COPY nginx.conf /etc/nginx/nginx.conf

# Kopiujemy z build/ (dla Create React App)
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]