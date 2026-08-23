# 1. Base Node.js image
FROM node:20-alpine

# 2. Set working directory
WORKDIR /app

# 3. Copy package manifests and install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# 4. Copy application source code
COPY . .

# 5. Expose Next.js port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 6. Run Next.js development server
CMD ["npm", "run", "dev"]

