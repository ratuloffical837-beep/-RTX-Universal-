FROM ghcr.io/puppeteer/puppeteer:22.10.0

# অফিশিয়াল ইমেজের ডিফল্ট ক্রোম এক্সিকিউটেবল পাথ ব্যবহার নিশ্চিত করা হলো
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /usr/src/app

# অফিশিয়াল ইমেজের পারমিশন কনফ্লিক্ট এড়াতে রুট হিসেবে মডিউল ইন্সটলেশন
USER root

COPY package.json ./
RUN npm install --omit=dev

COPY . .

# রানটাইম স্যান্ডবক্স এরর প্রোটেকশনের জন্য ওনারশিপ ফিক্স
RUN chown -R pptruser:pptruser /usr/src/app

# কন্টেইনার সিকিউরিটি ও পুপেটিয়ার পারমিশন বজায় রাখতে pptruser এ ব্যাক করা হলো
USER pptruser

EXPOSE 3000

CMD [ "node", "server.js" ]
