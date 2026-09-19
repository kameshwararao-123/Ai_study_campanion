# Deployment Guide: AI Study Companion

This document provides complete instructions for deploying the **AI Study Companion** application.

---

## Architecture Overview

The application supports two primary deployment topologies:

1. **Option A: Monolithic Deployment (Recommended & Simplest)**
   - Express backend serves both the `/api/*` endpoints and the compiled React frontend (`client/dist`).
   - Single URL, zero CORS issues, single service to deploy (Render, Railway, Heroku, Fly.io, Docker/VPS).
2. **Option B: Decoupled Deployment**
   - Frontend hosted on static CDN (Vercel, Netlify, Cloudflare Pages).
   - Backend API hosted on a web service (Render, Railway, Fly.io).

---

## Pre-Deployment Checklist

1. **MongoDB Atlas IP Access**:
   - Go to MongoDB Atlas -> **Network Access**.
   - Add IP Address: `0.0.0.0/0` (Allow access from anywhere, as cloud platforms rotate outbound IPs).
2. **Obtain API Keys**:
   - `MONGODB_URI`: Atlas connection string.
   - `JWT_SECRET`: Random 32+ character string (`openssl rand -base64 32`).
   - `GEMINI_API_KEY`: Google AI Studio key (or `OPENAI_API_KEY`).

---

## Option A: Monolithic Single-Service Deployment

### Method 1: Render (Web Service)

1. Connect your GitHub repository to [Render](https://render.com).
2. Select **Web Service**.
3. Configure the service:
   - **Environment**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
4. Set Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `10000` (Render will set this automatically)
   - `MONGODB_URI`: `<your-mongodb-atlas-uri>`
   - `JWT_SECRET`: `<your-jwt-secret>`
   - `AI_PROVIDER`: `gemini`
   - `GEMINI_API_KEY`: `<your-gemini-key>`
5. Click **Create Web Service**.
6. When deployment finishes, navigate to `https://<your-service>.onrender.com`. Both the frontend and API work out of the box!

---

### Method 2: Docker Container (Render, Railway, Fly.io, VPS)

A multi-stage `Dockerfile` is provided in the repository root.

**Build and Run locally or on VPS:**
```bash
# Build container image
docker build -t ai-study-companion .

# Run container
docker run -d \
  -p 5000:5000 \
  -e NODE_ENV=production \
  -e PORT=5000 \
  -e MONGODB_URI="mongodb+srv://..." \
  -e JWT_SECRET="your-jwt-secret" \
  -e AI_PROVIDER="gemini" \
  -e GEMINI_API_KEY="your-gemini-key" \
  --name ai-study-companion \
  ai-study-companion
```

Access at `http://localhost:5000` (or `http://your-server-ip:5000`).

---

### Method 3: Railway

1. Connect GitHub repo to [Railway](https://railway.app).
2. Railway detects `package.json`:
   - Build command: `npm run build`
   - Start command: `npm start`
3. Add the environment variables (`MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, etc.) in the **Variables** tab.
4. Generate a public domain under **Settings -> Networking**.

---

## Option B: Decoupled Deployment (Vercel + Render)

### Step 1: Deploy Backend (Render / Railway)
- Follow standard Node deployment pointing to repository root.
- Start Command: `node server/index.js`
- Set `CLIENT_URL=https://your-frontend.vercel.app` (to allow CORS from Vercel).
- Note your backend URL, e.g., `https://ai-companion-api.onrender.com`.

### Step 2: Deploy Frontend on Vercel
1. In Vercel, import your repository.
2. Set **Root Directory** to `client`.
3. Set **Framework Preset** to `Vite`.
4. Configure Environment Variables:
   - `VITE_API_URL`: `https://ai-companion-api.onrender.com/api`
   - `VITE_BACKEND_URL`: `https://ai-companion-api.onrender.com`
5. Click **Deploy**.
6. `client/vercel.json` ensures client-side routes (`/projects`, `/quiz`, etc.) work upon browser refresh without 404 errors.

---

## Verification & Health Check

After deployment, test the health check endpoint:
```bash
curl https://<your-deployed-domain>/api/health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-09-19T..."
  }
}
```

