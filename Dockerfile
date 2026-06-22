FROM ghcr.io/puppeteer/puppeteer:22.10.0

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /usr/src/app

USER root

COPY package.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3000

CMD [ "node", "server.js" ]
