# PowerShell test runner script for Backend & ML test suites

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir

Set-Location $RootDir

$PytestBin = "$RootDir\.venv\Scripts\pytest.exe"
if (-not (Test-Path $PytestBin)) {
    $PytestBin = "pytest"
}

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "Running Parkinson's Voice Screening Platform - Backend & ML Test Suite" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

& $PytestBin -v backend/tests ml/tests $args
