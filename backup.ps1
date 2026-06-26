# Configurações com o seu caminho exato
$BackupDir = "D:\a-padoka\backups"
$DateStr = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$FileName = "padoka_db_$DateStr.sql"
$FilePath = Join-Path $BackupDir $FileName

# Cria a pasta de backups se não existir
if (-not (Test-Path -Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

Write-Host "Iniciando backup do banco de dados da Padoka..."

# Executa o pg_dump via cmd para interagir corretamente com o Docker no Windows
cmd /c "docker exec padoka_db pg_dump -U padoka_user padoka_db > `"$FilePath`""

# Retenção: Remove arquivos com mais de 7 dias para não lotar o HD (D:)
Write-Host "Limpando backups antigos..."
Get-ChildItem -Path $BackupDir -Filter "*.sql" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } | Remove-Item

Write-Host "Backup $FileName concluído com sucesso na pasta $BackupDir!"
