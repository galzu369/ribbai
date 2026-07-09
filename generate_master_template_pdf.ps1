# Script para gerar PDF do MASTER TEMPLATE
$htmlFile = "$PWD\reports\leaderboard\RIBBAI_MASTER_TEMPLATE_ranking_mensal.html"
$pdfFile = "$PWD\reports\leaderboard\RIBBAI_MASTER_TEMPLATE_ranking_mensal.pdf"

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
    
    Write-Host "MASTER TEMPLATE PDF gerado com sucesso: $pdfFile"
}
catch {
    Write-Host "Erro ao gerar PDF com Word: $_"
    
    # Método alternativo - abrir no browser
    Write-Host "Abrindo MASTER TEMPLATE no browser para conversão manual..."
    Start-Process $htmlFile
    Write-Host "Por favor, use Ctrl+P e selecione 'Microsoft Print to PDF' no browser."
}