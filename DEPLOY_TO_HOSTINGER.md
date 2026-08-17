# Quick Deployment to Hostinger - Fix CORS

## Files Changed That Need Upload:

### 1. server/server.js ⭐ (IMPORTANT)
   - **This file has the CORS fix**
   - Upload to: `/home/u781420267/domains/apitravel360.salexo.co.in/nodejs/server.js`

### 2. server/config/db.js
   - Enhanced database connection logging
   - Upload to: `/home/u781420267/domains/apitravel360.salexo.co.in/nodejs/config/db.js`

### 3. server/middleware/error.js
   - Better error logging
   - Upload to: `/home/u781420267/domains/apitravel360.salexo.co.in/nodejs/middleware/error.js`

### 4. Update .env on Hostinger
   Edit the `.env` file directly on Hostinger:
   ```env
   NODE_ENV=production
   PORT=5000
   MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/travel_erp
   JWT_SECRET=your_secret_here
   JWT_EXPIRES_IN=7d
   CLIENT_URL=http://localhost:5173
   ```

## Steps to Deploy:

### Method 1: Using Hostinger File Manager
1. Login to Hostinger hPanel
2. Go to File Manager
3. Navigate to `/domains/apitravel360.salexo.co.in/nodejs/`
4. Upload these files:
   - `server.js` (replaces old one)
   - `config/db.js`
   - `middleware/error.js`
5. Edit `.env` file and add: `CLIENT_URL=http://localhost:5173`
6. Go to Node.js section → Click **Restart Application**

### Method 2: Using FTP
1. Connect via FTP to your Hostinger
2. Navigate to `/domains/apitravel360.salexo.co.in/nodejs/`
3. Upload the files listed above
4. Edit `.env` file
5. Restart application in hPanel

### Method 3: Using SSH (if available)
```bash
# Connect to Hostinger
ssh u781420267@your-server

# Navigate to your app
cd /home/u781420267/domains/apitravel360.salexo.co.in/nodejs

# Upload files (or use git pull if you have git setup)
# Edit .env
nano .env

# Add this line:
# CLIENT_URL=http://localhost:5173

# Save and exit (Ctrl+X, Y, Enter)

# Restart the app from hPanel
```

## After Deployment:

1. ✅ Check Hostinger logs - should see:
   ```
   🚀 STARTING SERVER...
   ✅ DATABASE CONNECTED SUCCESSFULLY!
   ✅ CORS enabled for origins: [ 'http://localhost:5173' ]
   ✅ SERVER RUNNING SUCCESSFULLY!
   ```

2. ✅ Test from your browser (http://localhost:5173)
   - CORS error should be GONE
   - Login should work

## Quick Test:
Visit this URL in browser:
```
https://apitravel360.salexo.co.in/api/health
```

Should return:
```json
{
  "status": "ok",
  "time": "2026-07-17...",
  "uptime": 123.456,
  "memory": {...}
}
```

## Troubleshooting:

### If CORS error persists:
1. Check Hostinger logs for "✅ CORS enabled for origins"
2. Verify `.env` file has `CLIENT_URL=http://localhost:5173`
3. Make sure you restarted the Node.js app
4. Clear browser cache (Ctrl+Shift+Delete)
5. Hard refresh page (Ctrl+Shift+R)

### If you see "⚠️ CORS blocked origin: http://localhost:5173":
- The server is running but CLIENT_URL is not set correctly
- Update `.env` and restart again
