<#
.SYNOPSIS
  Genera el ejecutable de Windows del Laboratorio Numérico (desktop\dist\LaboratorioNumerico.exe).

.DESCRIPTION
  1. Compila el frontend (frontend\dist).
  2. Empaqueta el motor FastAPI + el frontend con PyInstaller (desktop\artifacts\pyinstaller\motor).
  3. Lo comprime en desktop\artifacts\motor.zip y escribe su versión.
  4. Publica el host .NET 10 + WebView2 como UN SOLO .exe autocontenido con el motor incrustado.

  Requisitos (en Windows x64): Node.js 20+, Python 3.12+ (con el lanzador «py» o «python» en PATH)
  y el SDK de .NET 10.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File desktop\build.ps1
#>
[CmdletBinding()]
param(
    [switch]$SaltarFrontend,
    [switch]$SaltarMotor
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Desktop   = $PSScriptRoot
$Raiz      = Split-Path $Desktop -Parent
$Artifacts = Join-Path $Desktop 'artifacts'
$Venv      = Join-Path $Desktop '.venv-build'
$Dist      = Join-Path $Desktop 'dist'
$Proyecto  = Join-Path $Desktop 'LaboratorioNumerico.Desktop\LaboratorioNumerico.Desktop.csproj'

function Paso($texto) { Write-Host "`n==> $texto" -ForegroundColor Cyan }
function Ejecutar([string]$exe, [string[]]$argumentos) {
    & $exe @argumentos
    if ($LASTEXITCODE -ne 0) { throw "Falló: $exe $($argumentos -join ' ') (código $LASTEXITCODE)" }
}
function Requiere([string]$comando, [string]$ayuda) {
    if (-not (Get-Command $comando -ErrorAction SilentlyContinue)) { throw "No se encontró '$comando'. $ayuda" }
}

Requiere 'dotnet' 'Instala el SDK de .NET 10: https://dotnet.microsoft.com/download'
New-Item -ItemType Directory -Force $Artifacts | Out-Null

# ---------------------------------------------------------------- 1. Frontend
if (-not $SaltarFrontend) {
    Paso 'Compilando el frontend'
    Requiere 'npm' 'Instala Node.js 20+: https://nodejs.org'
    if (-not (Test-Path (Join-Path $Raiz 'frontend\node_modules'))) {
        Ejecutar 'npm' @('--prefix', (Join-Path $Raiz 'frontend'), 'ci')
    }
    Ejecutar 'npm' @('--prefix', (Join-Path $Raiz 'frontend'), 'run', 'build')
}
if (-not (Test-Path (Join-Path $Raiz 'frontend\dist\index.html'))) { throw 'Falta frontend\dist (compila el frontend).' }

# ---------------------------------------------------------------- 2-3. Motor (PyInstaller)
if (-not $SaltarMotor) {
    Paso 'Preparando el entorno de Python para empaquetar'
    $PyExe = Join-Path $Venv 'Scripts\python.exe'
    if (-not (Test-Path $PyExe)) {
        if (Get-Command 'py' -ErrorAction SilentlyContinue) { Ejecutar 'py' @('-3', '-m', 'venv', $Venv) }
        else { Requiere 'python' 'Instala Python 3.12+: https://www.python.org'; Ejecutar 'python' @('-m', 'venv', $Venv) }
    }
    Ejecutar $PyExe @('-m', 'pip', 'install', '--upgrade', 'pip')
    Ejecutar $PyExe @('-m', 'pip', 'install', '-r', (Join-Path $Raiz 'backend\requirements.txt'), 'pyinstaller')

    Paso 'Empaquetando el motor numérico con PyInstaller'
    Ejecutar $PyExe @('-m', 'PyInstaller', '--noconfirm', '--clean',
        '--distpath', (Join-Path $Artifacts 'pyinstaller'),
        '--workpath', (Join-Path $Artifacts 'build'),
        (Join-Path $Desktop 'motor\motor.spec'))

    $Motor = Join-Path $Artifacts 'pyinstaller\motor'
    # Nunca se distribuyen datos locales (BD ni fotos de alumnos).
    foreach ($c in 'data', 'uploads') { Remove-Item -Recurse -Force (Join-Path $Motor $c) -ErrorAction SilentlyContinue }

    Paso 'Comprimiendo el motor'
    $Zip = Join-Path $Artifacts 'motor.zip'
    Remove-Item -Force $Zip -ErrorAction SilentlyContinue
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($Motor, $Zip, [System.IO.Compression.CompressionLevel]::Optimal, $false)

    $commit = 'local'
    try { $commit = (git -C $Raiz rev-parse --short HEAD 2>$null) } catch { }
    "$(Get-Date -Format 'yyyyMMddHHmmss')-$commit" | Set-Content -NoNewline -Encoding ascii (Join-Path $Artifacts 'motor.version')
}
if (-not (Test-Path (Join-Path $Artifacts 'motor.zip'))) { throw 'Falta desktop\artifacts\motor.zip (no uses -SaltarMotor la primera vez).' }

# ---------------------------------------------------------------- 4. Host .NET 10 + WebView2
Paso 'Publicando el ejecutable .NET 10 + WebView2'
Ejecutar 'dotnet' @('publish', $Proyecto, '-c', 'Release', '-o', $Dist)

$Exe = Join-Path $Dist 'LaboratorioNumerico.exe'
$MB = [math]::Round((Get-Item $Exe).Length / 1MB, 1)
Write-Host "`nListo: $Exe ($MB MB)" -ForegroundColor Green
