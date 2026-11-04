# Feelings Wheel — How to Run Locally

## Prerequisites
- Node.js 20+
- Docker Desktop (for MySQL)

## First-time setup

```bash
# 1. Start MySQL
docker compose up db -d

# 2. Install backend dependencies and run migrations
cd apps/backend
npm install
npx prisma migrate dev
npm run db:seed

# 3. Install frontend dependencies
cd ../frontend
npm install
```

## Running the app

Open two terminals:

**Terminal 1 — Backend API**
```bash
cd apps/backend
npm run dev
# API running at http://localhost:3001
```

**Terminal 2 — Frontend**
```bash
cd apps/frontend
npm run dev
# App running at http://localhost:5173
```

Open http://localhost:5173 in your browser.

## Database tools

```bash
cd apps/backend
npm run db:studio   # Opens Prisma Studio (visual DB browser)
npm run db:seed     # Re-seeds all emotion data
npm run db:migrate  # Run new migrations
```

## Project structure

```
feelings-wheel/
├── apps/
│   ├── frontend/          React + TypeScript + Vite
│   └── backend/           Express + TypeScript + Prisma
├── source/                Original PDF source files
├── data/                  (future) JSON seed file exports
├── docs/                  Developer documentation and plans
└── docker-compose.yml     Local MySQL + app containers
```
