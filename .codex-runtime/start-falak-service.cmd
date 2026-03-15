@echo off
set DATABASE_URL=postgresql://postgres:postgres@localhost:5433/anu_falak_test?schema=falak
set DIRECT_URL=postgresql://postgres:postgres@localhost:5433/anu_falak_test?schema=falak
set SHADOW_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/anu_falak_shadow?schema=falak
set JWT_SECRET_KEY=falak-local-verification-secret
set PORT=5003
cd /d C:\Dev\Flora_fauna\services\impact-service
node dist/server.js
