# AegisAI — Local Development Setup Guide

## Prerequisites

| Tool | Version | Purpose |
| :--- | :--- | :--- |
| **Node.js** | `v20+` (LTS recommended) | Backend & Frontend Runtime |
| **npm** | `v10+` | Package Management |
| **PostgreSQL** | `v15+` (or Neon Serverless) | Relational Database |
| **Google Gemini API Key** | Free Tier or Paid | LLM Multi-Agent Reasoning Engine |
| **Git** | Any modern release | Version Control |

---

## 1. Clone the Repository

```bash
git clone https://github.com/your-username/AegisAI.git
cd AegisAI
```

---

## 2. Backend Setup & Configuration

### Step A: Install Dependencies
```bash
cd backend
npm install
```

### Step B: Environment Variables
Create `.env` inside `backend/` based on `backend/.env.example`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/aegis_ai_db?schema=public"
GEMINI_API_KEY="your-gemini-api-key-here"
AI_PROVIDER="gemini"
AI_KEY_ENCRYPTION_SECRET="your-32-byte-hex-encryption-secret"
PORT=5000
FRONTEND_URL="http://localhost:5174"
```

> [!WARNING]
> Never commit `backend/.env` to source control. The repository `.gitignore` automatically excludes `.env` files.

### Step C: Initialize Prisma Database Schema
```bash
npx prisma generate
npx prisma db push
```

### Step D: Start Backend Development Server
```bash
npm run dev
```
The REST API starts at `http://localhost:5000`.  
Verify health: `http://localhost:5000/api/health`

---

## 3. Frontend Setup

### Step A: Install Dependencies
```bash
cd ../frontend
npm install
```

### Step B: Start Vite Development Server
```bash
npm run dev
```
The frontend starts at `http://localhost:5174` (or `http://localhost:5173`).

---

## 4. Docker Compose Setup (Optional)

To spin up a local PostgreSQL container alongside backend and frontend:

```bash
docker-compose up --build -d
```

To stop containers:
```bash
docker-compose down
```

---

## 5. Verification & Test Suite

Run the validation test runners from `backend/`:

```bash
cd backend

# Compile TypeScript checks (Zero errors)
npx tsc --noEmit

# Dataset consistency check
npx ts-node src/check_dataset_consistency.ts

# Multi-format parser validation
npx ts-node src/test_phase4_formats.ts

# BYOK AES-256-GCM encryption validation
npx ts-node src/test_phase5_byok.ts
```

---

## 6. Cloud Production Deployment (Render + Vercel + Neon)

### A. Neon Serverless PostgreSQL
1. Create a database on [Neon](https://neon.tech) and copy the connection string.
2. Synchronize schema from local machine:
   ```bash
   cd backend
   DATABASE_URL="your-neon-connection-string?sslmode=require" npx prisma db push
   ```

### B. Render (Backend Web Service)
1. In [Render Dashboard](https://dashboard.render.com), create a new **Web Service** pointing to the repository.
2. Settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npm start`
3. Configure Environment Variables:
   - `DATABASE_URL`: Your Neon connection string
   - `JWT_SECRET`: 32+ character random secret
   - `AI_KEY_ENCRYPTION_SECRET`: 32-byte secret for BYOK encryption
   - `AI_PROVIDER`: `gemini`
   - `GEMINI_API_KEY`: System Gemini fallback key
   - `FRONTEND_URL`: Your Vercel frontend URL (e.g. `https://your-app.vercel.app`)

### C. Vercel (Frontend)
1. In [Vercel Dashboard](https://vercel.com), import the `AegisAI` repository.
2. Settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Environment Variables:
   - `VITE_API_BASE_URL`: Your Render Web Service URL (e.g. `https://your-app.onrender.com`)


