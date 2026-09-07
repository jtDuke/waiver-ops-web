[CmdletBinding()]
param(
    [ValidateRange(1, 65535)]
    [int]$ApiPort = 8000,

    [ValidateRange(1, 65535)]
    [int]$WebPort = 3000
)

$ErrorActionPreference = "Stop"
$webRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$workspaceRoot = Split-Path $webRoot -Parent
$apiRoot = Join-Path $workspaceRoot "waiver_priority"
$windowsPython = Join-Path $apiRoot ".venv\Scripts\python.exe"
$unixPython = Join-Path $apiRoot ".venv/bin/python"
$pythonPath = if (Test-Path -LiteralPath $windowsPython) {
    $windowsPython
} elseif (Test-Path -LiteralPath $unixPython) {
    $unixPython
} else {
    throw "The Waiver Ops Python environment was not found. Expected $windowsPython"
}

if (-not (Test-Path -LiteralPath (Join-Path $webRoot "node_modules"))) {
    throw "Frontend dependencies are missing. Run 'npm install' once from $webRoot"
}

function Test-WaiverApi {
    param([int]$Port)

    try {
        $response = Invoke-WebRequest `
            -Uri "http://127.0.0.1:$Port/health/live" `
            -UseBasicParsing `
            -TimeoutSec 1
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

$apiProcess = $null
$startedApi = $false
$webExitCode = 0

try {
    if (Test-WaiverApi -Port $ApiPort) {
        Write-Host "Using the Waiver Ops API already running on port $ApiPort." -ForegroundColor DarkGreen
    } else {
        $logRoot = Join-Path $webRoot ".devlogs"
        New-Item -ItemType Directory -Force -Path $logRoot | Out-Null
        $stdoutLog = Join-Path $logRoot "api.stdout.log"
        $stderrLog = Join-Path $logRoot "api.stderr.log"
        $apiArguments = @(
            "-m",
            "uvicorn",
            "waiver_api.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            $ApiPort.ToString()
        )

        $apiProcess = Start-Process `
            -FilePath $pythonPath `
            -ArgumentList $apiArguments `
            -WorkingDirectory $apiRoot `
            -RedirectStandardOutput $stdoutLog `
            -RedirectStandardError $stderrLog `
            -WindowStyle Hidden `
            -PassThru
        $startedApi = $true

        $ready = $false
        for ($attempt = 0; $attempt -lt 40; $attempt += 1) {
            if ($apiProcess.HasExited) {
                $details = if (Test-Path -LiteralPath $stderrLog) {
                    (Get-Content -Raw -LiteralPath $stderrLog).Trim()
                } else {
                    "No API error log was written."
                }
                throw "The Waiver Ops API stopped during startup. $details"
            }
            if (Test-WaiverApi -Port $ApiPort) {
                $ready = $true
                break
            }
            Start-Sleep -Milliseconds 250
        }
        if (-not $ready) {
            throw "The Waiver Ops API did not become ready. Check $stderrLog"
        }
        Write-Host "Waiver Ops API ready at http://127.0.0.1:$ApiPort" -ForegroundColor DarkGreen
    }

    $env:WAIVER_API_BASE_URL = "http://127.0.0.1:$ApiPort"
    Write-Host "Starting the website at http://localhost:$WebPort" -ForegroundColor Cyan
    Write-Host "Press Ctrl+C once to stop the local stack." -ForegroundColor DarkGray
    Push-Location $webRoot
    try {
        & npm.cmd run dev -- --port $WebPort
        $webExitCode = $LASTEXITCODE
    } finally {
        Pop-Location
    }
} finally {
    if ($startedApi -and $null -ne $apiProcess -and -not $apiProcess.HasExited) {
        Stop-Process -Id $apiProcess.Id
        $apiProcess.WaitForExit(5000)
        Write-Host "Stopped the local Waiver Ops API." -ForegroundColor DarkGray
    }
}

exit $webExitCode
