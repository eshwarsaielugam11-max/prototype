# PowerShell script to run Frontend test suite
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir
$frontendDir = Join-Path $rootDir "frontend"

Set-Location $frontendDir

Write-Host "================================================================================"
Write-Host "Running Parkinson's Voice Screening Platform - Frontend Test Suite (Vitest)"
Write-Host "================================================================================"

npm run test -- $args
