# Script para gerar PDF do leaderboard
$htmlFile = "$PWD\reports\leaderboard\2026-06-ranking-mensal-equipa-ribbai-final.html"
$pdfFile = "$PWD\reports\leaderboard\2026-06-ranking-mensal-equipa-ribbai-final.pdf"

# Tentar usar Microsoft Print to PDF
try {
    # Criar objeto Word se disponível
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    
    # Abrir documento HTML
    $doc = $word.Documents.Open($htmlFile)
    
    # Exportar como PDF
    $doc.ExportAsFixedFormat($pdfFile, 17) # 17 = wdExportFormatPDF
    
    # Fechar documento e Word
    $doc.Close()
    $word.Quit()
    
    Write-Host "PDF gerado com sucesso: $pdfFile"
}
catch {
    Write-Host "Erro ao gerar PDF com Word: $_"
    
    # Método alternativo - abrir no browser padrão
    Write-Host "Abrindo HTML no browser para conversão manual..."
    Start-Process $htmlFile
    Write-Host "Por favor, use Ctrl+P e selecione 'Microsoft Print to PDF' no browser."
}