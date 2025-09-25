# Use Node.js 18 Alpine image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy prisma schema first
COPY prisma ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build the application
RUN yarn build

# Expose port
EXPOSE 3000

# Start the application with database migration
CMD ["sh", "-c", "npx prisma db push --schema=./prisma/schema.prisma && yarn start:prod"]