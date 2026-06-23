# RTX SMM Panel - Production Dockerfile
# Optimized for Puppeteer with Chrome

FROM ghcr.io/puppeteer/puppeteer:23.5.0

# Set Chrome executable path
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /usr/src/app

# Switch to root for installations
USER root

# নতুন কোড:
# Copy package files from local directory AND the lock file from main root
COPY package.json ./
COPY ../../package-lock.json ./ 2>/dev/null || true

# Install dependencies safely
RUN npm install --omit=dev

# Copy source files
COPY . .

# Fix ownership for pptruser
RUN chown -R pptruser:pptruser /usr/src/app

# Switch back to non-root user for security
USER pptruser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start server
CMD ["node", "server.js"]
