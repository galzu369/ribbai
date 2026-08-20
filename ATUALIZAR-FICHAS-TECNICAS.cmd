@echo off
rem RIBBAI - Atualiza as fichas tecnicas com os precos do Precario.
rem %~dp0 e a pasta deste ficheiro: funciona em qualquer computador, disco ou
rem utilizador Windows, desde que a pasta RIBBAI seja copiada por inteiro.
cd /d "%~dp0"

call "%~dp0runtime\run-engine.cmd" --apply
set "EXITCODE=%ERRORLEVEL%"

echo.
if "%EXITCODE%"=="0" (
    echo Pode fechar esta janela.
) else (
    echo A atualizacao NAO foi concluida. Leia a mensagem acima.
)
echo.
pause
exit /b %EXITCODE%
