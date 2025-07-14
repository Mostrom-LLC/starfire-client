FROM public.ecr.aws/docker/library/node:22

# Set environment variables
ENV NODE_ENV=production
ENV PORT=80

# Environment variables from .env

ARG VITE_API_KEY
ARG VITE_S3_BUCKET_NAME
ARG VITE_WEB_SOCKET_URL

ENV VITE_S3_BUCKET_NAME=$VITE_S3_BUCKET_NAME
ENV VITE_APIKEY=$VITE_APIKEY
ENV VITE_WEB_SOCKET_URL=$VITE_WEB_SOCKET_URL


# Create app directory
WORKDIR /app

# Install all dependencies including devDependencies
COPY package*.json ./
RUN npm install -g typescript
RUN npm ci --include=dev

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port 80 for AWS
EXPOSE 80

# Start the application on port 80
CMD ["npm", "run", "dev", "--", "--host", "--port", "80"]
