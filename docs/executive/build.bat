@echo off
title RIBBAI 2.0 - Executive Manual PDF Generator

echo.
echo ================================================
echo   RIBBAI 2.0 Executive Manual PDF Generator
echo   Premium Corporate Document Generator  
echo ================================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js não encontrado!
    echo.
    echo Por favor, instale Node.js primeiro:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Display Node.js version
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js detectado: %NODE_VERSION%

:: Check if npm is available  
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm não encontrado!
    echo.
    pause
    exit /b 1
)

:: Display npm version
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✅ npm detectado: v%NPM_VERSION%
echo.

:: Check if we're in the right directory
if not exist "package.json" (
    echo ❌ package.json não encontrado!
    echo Certifique-se de estar na pasta docs/executive/
    echo.
    pause
    exit /b 1
)

if not exist "html\index.html" (
    echo ❌ Arquivo HTML não encontrado!
    echo Certifique-se de que html/index.html existe.
    echo.
    pause
    exit /b 1
)

echo 📦 Instalando dependências...
echo.
npm install
if errorlevel 1 (
    echo ❌ Erro na instalação das dependências!
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Dependências instaladas com sucesso!
echo.

:: Create PDF directory if it doesn't exist
if not exist "pdf" mkdir pdf

echo 🖨️ Gerando PDF Executive Manual...
echo.
node generate-pdf.js
if errorlevel 1 (
    echo ❌ Erro na geração do PDF!
    echo.
    echo 🔧 Possíveis soluções:
    echo - Verificar se o Chrome/Chromium está instalado
    echo - Executar como administrador  
    echo - Verificar espaço em disco disponível
    echo.
    pause
    exit /b 1
)

echo.
echo 🎉 PDF GERADO COM SUCESSO!
echo =============================
echo.

:: Check if PDF was created and get file size
if exist "pdf\RIBBAI_2.0_EXECUTIVE_MANUAL.pdf" (
    echo ✅ PDF criado: pdf\RIBBAI_2.0_EXECUTIVE_MANUAL.pdf
    
    :: Get file size
    for %%A in ("pdf\RIBBAI_2.0_EXECUTIVE_MANUAL.pdf") do (
        set /a SIZE_KB=%%~zA/1024
        set /a SIZE_MB=!SIZE_KB!/1024
    )
    
    setlocal enabledelayedexpansion
    echo 📊 Tamanho: !SIZE_KB! KB (~!SIZE_MB! MB)
    echo 📅 Gerado: %date% %time%
    endlocal
    
    echo.
    echo 📋 ARQUIVOS DISPONÍVEIS:
    echo - PDF: pdf\RIBBAI_2.0_EXECUTIVE_MANUAL.pdf  
    echo - HTML: html\index.html
    echo - Preview: pdf\RIBBAI_2.0_PREVIEW.html
    echo.
    
    echo 🎯 PRÓXIMOS PASSOS:
    echo 1. Abrir e revisar o PDF gerado
    echo 2. Testar impressão em modo de visualização  
    echo 3. Verificar qualidade em diferentes viewers
    echo 4. Validar todos os elementos visuais
    echo.
    
    echo 🚀 COMANDOS ÚTEIS:
    echo - npm run serve    (servidor local HTML)
    echo - npm run generate (regenerar PDF)  
    echo - npm run clean    (limpar PDFs anteriores)
    echo.
    
    :: Ask if user wants to open the PDF
    set /p OPEN_PDF=Deseja abrir o PDF agora? (s/n): 
    if /i "%OPEN_PDF%"=="s" (
        start "" "pdf\RIBBAI_2.0_EXECUTIVE_MANUAL.pdf"
    )
    
    :: Ask if user wants to start local server for HTML preview
    set /p START_SERVER=Deseja iniciar servidor local para preview HTML? (s/n): 
    if /i "%START_SERVER%"=="s" (
        echo.
        echo 🌐 Iniciando servidor local em http://localhost:3000
        echo Pressione Ctrl+C para parar o servidor.
        echo.
        npm run serve
    )
    
) else (
    echo ❌ PDF não foi criado!
    echo Verifique os logs de erro acima.
)

echo.
echo 📋 Log da execução salvo automaticamente.
echo 🎯 Para regenerar: execute build.bat novamente
echo.
pause