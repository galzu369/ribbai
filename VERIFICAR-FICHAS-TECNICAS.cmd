@echo off
rem RIBBAI - Mostra o que mudaria nas fichas tecnicas, SEM alterar nada.
rem Util para conferir os precos antes de atualizar a serio.
cd /d "%~dp0"

call "%~dp0runtime\run-engine.cmd" --dry-run
set "EXITCODE=%ERRORLEVEL%"

echo.
echo Esta foi apenas uma verificacao: NENHUM ficheiro foi alterado.
echo Para atualizar mesmo, use ATUALIZAR-FICHAS-TECNICAS.cmd
echo.
pause
exit /b %EXITCODE%
