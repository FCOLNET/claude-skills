# Prépare les photos des articles pour l'outil de réassort.
# Copie, réduit et compresse les photos listées dans codes_photos.txt depuis le
# partage photo, puis les range dans une archive à déposer dans la conversation.
#
# Usage (clic droit > Exécuter avec PowerShell, ou dans une console) :
#   powershell -ExecutionPolicy Bypass -File .\extraire_photos.ps1
# Options : -Codes .\codes_photos.txt -Source \\10.10.101.52\SMRC_photo -Taille 120

param(
  [string]$Codes  = (Join-Path $PSScriptRoot "codes_photos.txt"),
  [string]$Source = "\\10.10.101.52\SMRC_photo",
  [string]$Sortie = (Join-Path $PSScriptRoot "photos_reassort"),
  [int]$Taille    = 120
)

Add-Type -AssemblyName System.Drawing
if (-not (Test-Path $Codes))  { Write-Host "Liste introuvable : $Codes"; exit 1 }
if (-not (Test-Path $Source)) { Write-Host "Partage photo inaccessible : $Source"; exit 1 }
# Repartir d'un dossier de sortie vide, sans jamais toucher au dossier source.
if ((Test-Path $Sortie) -and ((Resolve-Path $Sortie).Path.TrimEnd('\') -ne (Resolve-Path $Source).Path.TrimEnd('\'))) {
  Remove-Item (Join-Path $Sortie "*.jpg") -Force
}
New-Item -ItemType Directory -Force -Path $Sortie | Out-Null

$jpeg = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
$qualite = New-Object System.Drawing.Imaging.EncoderParameters(1)
$qualite.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]75)

$liste = Get-Content $Codes | ForEach-Object { $_.Trim() } | Where-Object { $_ }
$ok = 0; $absentes = 0; $illisibles = 0; $n = 0
foreach ($c in $liste) {
  $n++; $img = $null
  if ($n % 500 -eq 0) { Write-Host "$n / $($liste.Count)..." }
  $src = Join-Path $Source "$c.jpg"
  if (-not (Test-Path $src)) { $absentes++; continue }
  try {
    $img = [System.Drawing.Image]::FromFile($src)
    # 1.0 et non 1 : avec un entier, PowerShell choisit Min(int, int) et
    # arrondit le facteur de réduction à 0 ; la photo sortait en un pixel.
    $r = [Math]::Min(1.0, [Math]::Min([double]$Taille / $img.Width, [double]$Taille / $img.Height))
    $w = [int][Math]::Max(1, [Math]::Round($img.Width * $r))
    $h = [int][Math]::Max(1, [Math]::Round($img.Height * $r))
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.Clear([System.Drawing.Color]::White)   # fond blanc pour les PNG détourés
    $g.DrawImage($img, 0, 0, $w, $h)
    $bmp.Save((Join-Path $Sortie "$c.jpg"), $jpeg, $qualite)
    $g.Dispose(); $bmp.Dispose(); $img.Dispose()
    $ok++
  } catch {
    $illisibles++
    if ($img) { $img.Dispose() }
  }
}

$zip = "$Sortie.zip"
if (Test-Path $zip) { Remove-Item $zip }
Compress-Archive -Path (Join-Path $Sortie "*") -DestinationPath $zip
$mo = [Math]::Round((Get-Item $zip).Length / 1MB, 1)
Write-Host ""
Write-Host "Photos préparées : $ok   absentes du partage : $absentes   illisibles : $illisibles"
Write-Host "Archive à déposer dans la conversation : $zip ($mo Mo)"
