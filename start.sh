#!/bin/zsh
# start.sh — starts the backend and frontend for local development
# Run this from the project root: ./start.sh
# Both servers run in the foreground with output interleaved.
# Press Ctrl+C to stop both.

ROOT="$(cd "$(dirname "$0")" && pwd)"

# Trap Ctrl+C to kill both child processes
cleanup() {
  echo "\n[start.sh] Stopping servers..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  exit 0
}
trap cleanup INT TERM

echo "[start.sh] Starting backend on http://localhost:3001 ..."
cd "$ROOT/apps/backend" && npx tsx src/index.ts &
BACKEND_PID=$!

echo "[start.sh] Starting frontend on http://localhost:5173 ..."
cd "$ROOT/apps/frontend" && npx vite --port 5173 &
FRONTEND_PID=$!

echo "[start.sh] Both servers started."
echo "[start.sh] Backend:  http://localhost:3001"
echo "[start.sh] Frontend: http://localhost:5173"
echo "[start.sh] Press Ctrl+C to stop."

# Wait for either process to exit
wait $BACKEND_PID $FRONTEND_PID
