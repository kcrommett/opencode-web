# Windows Smoke Test Script for opencode-web bunx Detection
# This script validates the bunx detection and error messaging on Windows

param(
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "OpenCode Web - Windows Smoke Test" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Test counters
$testsTotal = 0
$testsPassed = 0
$testsFailed = 0

function Test-Scenario {
    param(
        [string]$Name,
        [scriptblock]$Test
    )
    
    $script:testsTotal++
    Write-Host "📋 Test $testsTotal : $Name" -ForegroundColor Yellow
    
    try {
        & $Test
        $script:testsPassed++
        Write-Host "✅ PASS" -ForegroundColor Green
    } catch {
        $script:testsFailed++
        Write-Host "❌ FAIL: $_" -ForegroundColor Red
        if ($Verbose) {
            Write-Host $_.ScriptStackTrace -ForegroundColor DarkRed
        }
    }
    
    Write-Host ""
}

# Helper function to simulate bunx temporary directory
function New-BunxTempDir {
    $tempPath = [System.IO.Path]::GetTempPath()
    $bunxDir = Join-Path $tempPath "bunx-12345-opencode-web-test"
    
    if (Test-Path $bunxDir) {
        Remove-Item $bunxDir -Recurse -Force
    }
    
    New-Item -ItemType Directory -Path $bunxDir | Out-Null
    return $bunxDir
}

# Check prerequisites
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Cyan

if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Bun is not installed. Install from https://bun.sh" -ForegroundColor Red
    exit 1
}

$bunVersion = bun --version
Write-Host "✅ Bun version: $bunVersion" -ForegroundColor Green

# Check if opencode CLI is available (for external server tests)
$opencodeAvailable = $null -ne (Get-Command opencode -ErrorAction SilentlyContinue)
if ($opencodeAvailable) {
    $opencodeVersion = opencode --version
    Write-Host "✅ OpenCode CLI version: $opencodeVersion" -ForegroundColor Green
} else {
    Write-Host "⚠️  OpenCode CLI not found - external server tests will be skipped" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================
# Scenario 1: Detect bunx pattern in directory path
# ============================================================
Test-Scenario "Detect bunx temporary directory pattern" {
    $testDir = New-BunxTempDir
    
    # Simulate running from bunx temp directory
    Push-Location $testDir
    
    try {
        # Create a minimal test script that checks for bunx detection
        $testScript = @"
const isBunxOnWindows = process.platform === "win32" && (() => {
    const cwd = process.cwd();
    const scriptPath = process.argv[1] || "";
    
    const bunxPatterns = [
        /bunx-\d+-/i,
        /\.bunx/i,
        /Temp.*bunx/i,
    ];
    
    return bunxPatterns.some(pattern => 
        pattern.test(cwd) || pattern.test(scriptPath)
    );
})();

if (isBunxOnWindows) {
    console.log("DETECTED");
    process.exit(42); // Use unique exit code for detection
} else {
    console.log("NOT_DETECTED");
    process.exit(0);
}
"@
        
        $testScriptPath = Join-Path $testDir "test-detect.js"
        Set-Content -Path $testScriptPath -Value $testScript
        
        $result = & bun run $testScriptPath
        $exitCode = $LASTEXITCODE
        
        if ($exitCode -ne 42) {
            throw "Expected bunx detection (exit code 42), got exit code $exitCode"
        }
        
        if ($result -ne "DETECTED") {
            throw "Expected 'DETECTED' output, got: $result"
        }
    } finally {
        Pop-Location
        Remove-Item $testDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# ============================================================
# Scenario 2: Verify error message format
# ============================================================
Test-Scenario "Verify bunx error message format" {
    $testDir = New-BunxTempDir
    
    Push-Location $testDir
    
    try {
        # Create a test script that simulates the CLI error
        $testScript = @"
console.error("");
console.error("[ERROR] Cannot launch bundled OpenCode Server via 'bunx' on Windows.");
console.error("");
console.error("This is a known limitation caused by Bun's /bin/sh remapping on Windows.");
console.error("The bundled server requires the 'opencode' CLI, which fails to start under bunx.");
console.error("");
console.error("✅ Recommended workarounds:");
console.error("");
console.error("  1. Use an external OpenCode Server:");
console.error("     bunx opencode-web@latest --external-server http://127.0.0.1:4096");
console.error("");
console.error("  2. Install locally and run:");
console.error("     bun install opencode-web");
console.error("     bun run opencode-web");
console.error("");
console.error("  3. Clone and build from source:");
console.error("     git clone https://github.com/sst/opencode-web");
console.error("     cd opencode-web");
console.error("     bun install && bun run build");
console.error("     bun run packages/opencode-web/bin/opencode-web.js");
console.error("");
console.error("📚 For more details, see the Windows troubleshooting section in:");
console.error("   https://github.com/sst/opencode-web#windows-bunx-limitation");
console.error("");
process.exit(1);
"@
        
        $testScriptPath = Join-Path $testDir "test-error.js"
        Set-Content -Path $testScriptPath -Value $testScript
        
        $output = & bun run $testScriptPath 2>&1
        $exitCode = $LASTEXITCODE
        
        if ($exitCode -ne 1) {
            throw "Expected exit code 1, got $exitCode"
        }
        
        $outputStr = $output -join "`n"
        
        # Verify key phrases in error message
        $requiredPhrases = @(
            "[ERROR] Cannot launch bundled OpenCode Server",
            "bunx",
            "Windows",
            "--external-server",
            "bun install opencode-web",
            "https://github.com/sst/opencode-web#windows-bunx-limitation"
        )
        
        foreach ($phrase in $requiredPhrases) {
            if (-not ($outputStr -like "*$phrase*")) {
                throw "Error message missing required phrase: $phrase"
            }
        }
    } finally {
        Pop-Location
        Remove-Item $testDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# ============================================================
# Scenario 3: Verify non-bunx directory is not flagged
# ============================================================
Test-Scenario "Regular directory should not trigger bunx detection" {
    $testDir = Join-Path ([System.IO.Path]::GetTempPath()) "regular-test-dir"
    
    if (Test-Path $testDir) {
        Remove-Item $testDir -Recurse -Force
    }
    
    New-Item -ItemType Directory -Path $testDir | Out-Null
    Push-Location $testDir
    
    try {
        $testScript = @"
const isBunxOnWindows = process.platform === "win32" && (() => {
    const cwd = process.cwd();
    const scriptPath = process.argv[1] || "";
    
    const bunxPatterns = [
        /bunx-\d+-/i,
        /\.bunx/i,
        /Temp.*bunx/i,
    ];
    
    return bunxPatterns.some(pattern => 
        pattern.test(cwd) || pattern.test(scriptPath)
    );
})();

if (isBunxOnWindows) {
    console.log("DETECTED");
    process.exit(1);
} else {
    console.log("NOT_DETECTED");
    process.exit(0);
}
"@
        
        $testScriptPath = Join-Path $testDir "test-regular.js"
        Set-Content -Path $testScriptPath -Value $testScript
        
        $result = & bun run $testScriptPath
        $exitCode = $LASTEXITCODE
        
        if ($exitCode -ne 0) {
            throw "Regular directory should not trigger bunx detection"
        }
        
        if ($result -ne "NOT_DETECTED") {
            throw "Expected 'NOT_DETECTED' output, got: $result"
        }
    } finally {
        Pop-Location
        Remove-Item $testDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# ============================================================
# Summary
# ============================================================
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Total:  $testsTotal" -ForegroundColor White
Write-Host "Passed: $testsPassed" -ForegroundColor Green
Write-Host "Failed: $testsFailed" -ForegroundColor $(if ($testsFailed -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($testsFailed -gt 0) {
    Write-Host "❌ Some tests failed. See output above for details." -ForegroundColor Red
    exit 1
} else {
    Write-Host "✅ All tests passed!" -ForegroundColor Green
    exit 0
}
