# RTX SMM Panel - Backend Reference

## 🚀 Deployment Guide

### Environment Variables Required

```env
# Firebase Admin SDK (Base64 encoded service account JSON)
FIREBASE_SERVICE_ACCOUNT_BASE64=eyJ0eXBlIjoi...

# Telegram Bots
ADMIN_BOT_TOKEN=123456:ABC-DEF...
USER_BOT_TOKEN=123456:ABC-DEF...
ADMIN_TELEGRAM_ID=123456789

# Server
PORT=3000
WEBAPP_URL=https://your-domain.com
```

### Firebase Service Account

1. Go to Firebase Console > Project Settings > Service Accounts
2. Click "Generate new private key"
3. Save the JSON file
4. Encode to Base64:
   ```bash
   base64 -i service-account.json | tr -d '\n'
   ```
5. Set as `FIREBASE_SERVICE_ACCOUNT_BASE64`

### Deploy to Render.com

1. Create new "Web Service"
2. Connect your GitHub repo
3. Set:
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Add all environment variables
5. Deploy!

### Deploy with Docker

```bash
# Build
docker build -t rtx-smm-backend .

# Run
docker run -d \
  -p 3000:3000 \
  -e FIREBASE_SERVICE_ACCOUNT_BASE64="..." \
  -e ADMIN_BOT_TOKEN="..." \
  -e USER_BOT_TOKEN="..." \
  -e ADMIN_TELEGRAM_ID="..." \
  --name rtx-smm \
  rtx-smm-backend
```

### Firestore Indexes

Create these composite indexes in Firebase Console:

1. **orders** collection:
   - `status` (Ascending) + `createdAt` (Ascending)

2. **fb_accounts** collection:
   - `status` (Ascending) + `lastUsed` (Ascending)

3. **deposits** collection:
   - `userId` (Ascending) + `createdAt` (Descending)
   - `status` (Ascending) + `createdAt` (Ascending)

### Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if false; // Server-only writes
    }
    
    // All other collections - server-only
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## 📁 File Structure

```
backend/
├── server.js          # Main Express server + Automation engine
├── adminBot.js        # Admin Telegram bot
├── userBot.js         # User Telegram bot
├── package.json       # Dependencies
├── Dockerfile         # Docker configuration
└── README.md          # This file
```

## 🔧 Features

- **Anti-Ban Engine**: Puppeteer Extra Stealth plugin
- **Account Rotation**: Longest-Idle-First strategy
- **Human Simulation**: Random delays, typing patterns
- **Self-Healing**: Auto-flags dead/checkpoint accounts
- **Real-time Updates**: Firebase listeners for orders
- **Concurrent Processing**: Safe parallel execution

## ⚠️ Important Notes

1. Never commit credentials to git
2. Use environment variables only
3. Monitor error logs regularly
4. Keep accounts pool healthy
5. Respect rate limits
