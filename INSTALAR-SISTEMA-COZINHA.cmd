@echo off
rem RIBBAI - Verifica se o sistema de custeio esta pronto a usar neste
rem computador. Correr uma vez, depois de copiar a pasta RIBBAI.
cd /d "%~dp0"

call "%~dp0runtime\run-engine.cmd" --install-check
set "EXITCODE=%ERRORLEVEL%"

echo.
if "%EXITCODE%"=="0" (
    echo Sistema verificado. Ja pode usar ATUALIZAR-FICHAS-TECNICAS.cmd
) else (
    echo Ha problemas por resolver. Leia a lista acima.
)
echo.
pause
exit /b %EXITCODE%
