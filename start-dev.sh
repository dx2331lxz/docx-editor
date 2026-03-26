#!/bin/bash
# Start sync server (background) + Vite dev server
SYNC_PID=$(lsof -ti:3011 2>/dev/null)
[ -n "$SYNC_PID" ] && kill "$SYNC_PID" 2>/dev/null
nohup node "$(dirname "$0")/sync-server/server.cjs" &>/tmp/sync-server.log &
echo "Sync server started (PID: $!)"
npm --prefix "$(dirname "$0")" run dev -- --host 0.0.0.0
