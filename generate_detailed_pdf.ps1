# Script para gerar PDF do ranking detalhado
$htmlFile = "$PWD\reports\leaderboard\2026-06-ranking-mensal-detalhado-equipa-ribbai.html"
$pdfFile = "$PWD\reports\leaderboard\2026-06-ranking-mensal-detalhado-equipa-ribbai.pdf"

# Tentar usar Microsoft Word para conversão
try {
    # Criar objeto Word
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    
    # Abrir documento HTML
    $doc = $word.Documents.Open($htmlFile)
    
    # Exportar como PDF
    $doc.ExportAsFixedFormat($pdfFile, 17) # 17 = wdExportFormatPDF
    
    # Fechar documento e Word
    $doc.Close()
    $word.Quit()
    
    Write-Host "PDF detalhado gerado com sucesso: $pdfFile"
}
catch {
    Write-Host "Erro ao gerar PDF com Word: $_"
    
    # Método alternativo - abrir no browser
    Write-Host "Abrindo HTML no browser para conversão manual..."
    Start-Process $htmlFile
    Write-Host "Por favor, use Ctrl+P e selecione 'Microsoft Print to PDF' no browser."
}