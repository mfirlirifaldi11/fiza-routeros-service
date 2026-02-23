# Gunakan base image Node.js yang ringan
FROM node:20-alpine

# Tentukan direktori kerja di dalam container
WORKDIR /app

# Copy package.json dan package-lock.json terlebih dahulu (untuk optimasi cache)
COPY package*.json ./

# Install dependensi
RUN npm install

# Copy seluruh kode project ke dalam container
COPY . .

# Expose port yang digunakan aplikasi
EXPOSE 3000

# Jalankan aplikasi
CMD ["npm", "run", "dev"]