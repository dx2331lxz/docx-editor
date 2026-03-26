#!/bin/bash
# Ensure sync-server is running via pm2
pm2 describe docx-sync-server > /dev/null 2>&1 \
  || pm2 start ~/projects/docx-editor/sync-server/server.cjs --name docx-sync-server
pm2 save
# Start Vite dev server
cd ~/projects/docx-editor
npm run dev -- --host 0.0.0.0
