@echo off
title The Scan Menu - Local Print Agent
echo =======================================================
echo   The Scan Menu - Local Thermal Print Agent v1.0.0
echo   Zero-Click Silent POS Thermal Printing Bridge
echo =======================================================
echo.
echo Starting Print Agent on http://127.0.0.1:18181 ...
echo Press Ctrl+C to stop the agent.
echo.

node dist/index.js

if errorlevel 1 (
  echo.
  echo [Notice] Compiling TypeScript source...
  npx ts-node src/index.ts
)

pause
