# PowerShell script to set up Python virtual environment (.venv)
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir

Write-Host "=== Setting up Python virtual environment (.venv) ===" -ForegroundColor Cyan
Set-Location -Path $RepoRoot

# Detect Python binary (prefer stable versions 3.11 / 3.12 / 3.10 for PyTorch compatibility)
$PythonCmd = $null
$Candidates = @("py -3.11", "py -3.12", "py -3.10", "python3.11", "python3.12", "python3.10", "python", "python3", "py -3")

foreach ($cand in $Candidates) {
    try {
        $parts = $cand -split " "
        $exe = $parts[0]
        $args = if ($parts.Length -gt 1) { $parts[1..($parts.Length - 1)] } else { @() }
        if (Get-Command $exe -ErrorAction SilentlyContinue) {
            $null = & $exe $args --version 2>$null
            if ($LASTEXITCODE -eq 0) {
                $PythonCmd = $cand
                break
            }
        }
    } catch {
        continue
    }
}

if (-not $PythonCmd) {
    Write-Error "Error: Python 3 is required but was not found in PATH."
    exit 1
}

$PythonVersion = & $PythonCmd --version
Write-Host "Using Python: $PythonVersion"

# Create virtual environment if it doesn't exist
$VenvDir = Join-Path $RepoRoot ".venv"
if (-not (Test-Path $VenvDir)) {
    Write-Host "Creating virtual environment at $VenvDir..."
    & $PythonCmd -m venv .venv
} else {
    Write-Host "Virtual environment already exists at $VenvDir."
}

# Determine activate script path
$ActivateScript = Join-Path $VenvDir "Scripts\Activate.ps1"
if (Test-Path $ActivateScript) {
    & $ActivateScript
} else {
    Write-Warning "Could not find $ActivateScript to activate directly in session."
}

$VenvPython = Join-Path $VenvDir "Scripts\python.exe"
if (Test-Path $VenvPython) {
    & $VenvPython -m pip install --upgrade pip
}

# TODO: Once backend/requirements.txt exists, install dependencies.
# Do not fail if the file is missing yet.
$RequirementsFile = Join-Path $RepoRoot "backend\requirements.txt"
if (Test-Path $RequirementsFile) {
    Write-Host "Installing dependencies from $RequirementsFile..."
    if (Test-Path $VenvPython) {
        & $VenvPython -m pip install -r $RequirementsFile
    } else {
        pip install -r $RequirementsFile
    }
} else {
    Write-Host "Note: $RequirementsFile not found yet. Skipping pip install." -ForegroundColor Yellow
    Write-Host "Dependencies will be installed once backend/requirements.txt is created."
}

Write-Host ""
Write-Host "=== Environment setup complete ===" -ForegroundColor Green
Write-Host "To activate the environment in PowerShell, run:"
Write-Host "    .\.venv\Scripts\Activate.ps1"
