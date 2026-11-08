# Aplica el parche de registro con Google, lo muestra y (si confirmas) hace commit y push.
# Uso, desde la raiz del repo (donde esta package.json), con el parche en la misma carpeta:
#   powershell -ExecutionPolicy Bypass -File .\aplicar-parche.ps1

$ErrorActionPreference = 'Stop'
$patch = '247studio-google-registro.patch'

if (-not (Test-Path 'package.json')) { Write-Host 'ERROR: ejecuta esto en la raiz del repo (donde esta package.json).' -ForegroundColor Red; exit 1 }
if (-not (Test-Path $patch))         { Write-Host "ERROR: no encuentro $patch en esta carpeta." -ForegroundColor Red; exit 1 }
if (-not (Test-Path '.git'))         { Write-Host 'ERROR: esta carpeta no es un repositorio git.' -ForegroundColor Red; exit 1 }

Write-Host 'Comprobando que el parche encaja...' -ForegroundColor Cyan
git apply --check $patch
if ($LASTEXITCODE -ne 0) {
  Write-Host 'El parche no encaja con tu codigo actual. No se ha cambiado nada. Pasame el mensaje de arriba.' -ForegroundColor Red
  exit 1
}

git apply $patch
Write-Host 'Parche aplicado. Archivos cambiados:' -ForegroundColor Green
git status --short

$peligro = git status --short | Select-String -Pattern 'adminsdk|serviceAccount'
if ($peligro) {
  Write-Host 'ATENCION: aparece una clave de cuenta de servicio en los cambios. NO hagas commit.' -ForegroundColor Red
  exit 1
}

$resp = Read-Host 'Hacer commit y push ahora? (s/n)'
if ($resp -ne 's') { Write-Host 'Vale. Cambios aplicados en local, sin commit.'; exit 0 }

git add -A
git commit -m 'Registro y acceso con Google: ficha de alumno, vinculacion de fichas y alta con cuenta real'
git push
Write-Host 'Listo. Netlify desplegara solo en unos minutos.' -ForegroundColor Green
