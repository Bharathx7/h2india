@echo off
rem Starts H2 India on this Windows computer: http://localhost:3000
rem Double-click this file. Options from a terminal: start-local.cmd -ComingSoon  (or -SkipInstall, -SkipSeed)
rem Runbook: docs\runbooks\run-locally.md
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-local.ps1" %*
