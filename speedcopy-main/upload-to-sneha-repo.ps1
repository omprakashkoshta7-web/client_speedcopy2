# Upload Client to Sneha's GitHub Repository
# Repository: https://github.com/snehakoshta/speedcopy_agu.git

$repoUrl = "https://github.com/snehakoshta/speedcopy_agu.git"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Uploading to: $repoUrl" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if git is initialized
if (-not (Test-Path ".git")) {
    Write-Host "Initializing Git repository..." -ForegroundColor Yellow
    git init
    Write-Host "✓ Git initialized" -ForegroundColor Green
    Write-Host ""
}

# Check current branch
$currentBranch = git branch --show-current 2>$null
if (-not $currentBranch) {
    Write-Host "Creating main branch..." -ForegroundColor Yellow
    git checkout -b main
    Write-Host "✓ Main branch created" -ForegroundColor Green
    Write-Host ""
}

# Check if remote exists
$existingRemote = git remote get-url origin 2>$null
if ($existingRemote) {
    if ($existingRemote -ne $repoUrl) {
        Write-Host "Updating remote URL..." -ForegroundColor Yellow
        git remote set-url origin $repoUrl
        Write-Host "✓ Remote updated to: $repoUrl" -ForegroundColor Green
    } else {
        Write-Host "✓ Remote already configured correctly" -ForegroundColor Green
    }
} else {
    Write-Host "Adding remote repository..." -ForegroundColor Yellow
    git remote add origin $repoUrl
    Write-Host "✓ Remote added: $repoUrl" -ForegroundColor Green
}

Write-Host ""
Write-Host "Scanning files..." -ForegroundColor Yellow

# Get all files
$allFiles = git status --porcelain | ForEach-Object { $_.Substring(3) }
$totalFiles = $allFiles.Count

Write-Host "Found $totalFiles files to upload" -ForegroundColor Cyan
Write-Host ""

if ($totalFiles -eq 0) {
    Write-Host "No files to upload!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    exit 0
}

# Calculate batches (80 files per batch)
$batchSize = 80
$batches = [Math]::Ceiling($totalFiles / $batchSize)

Write-Host "Will upload in $batches batch(es) of max $batchSize files each" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to start upload or Ctrl+C to cancel..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
Write-Host ""

# Upload in batches
for ($i = 0; $i -lt $batches; $i++) {
    $batchNum = $i + 1
    $start = $i * $batchSize
    $end = [Math]::Min(($i + 1) * $batchSize, $totalFiles)
    $batchFiles = $allFiles[$start..($end - 1)]
    $fileCount = $batchFiles.Count
    
    Write-Host "========================================" -ForegroundColor Cyan
    $batchInfo = "Batch $batchNum of $batches - $fileCount files"
    Write-Host $batchInfo -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    # Add files
    Write-Host "Adding files..." -ForegroundColor Yellow
    foreach ($file in $batchFiles) {
        git add $file 2>$null
    }
    
    # Commit
    $commitMsg = "Upload batch $batchNum of $batches - $fileCount files"
    Write-Host "Committing: $commitMsg" -ForegroundColor Yellow
    git commit -m $commitMsg 2>$null
    
    # Push
    Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
    git push -u origin main 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Batch $batchNum uploaded successfully!" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to upload batch $batchNum" -ForegroundColor Red
        Write-Host ""
        Write-Host "Possible reasons:" -ForegroundColor Yellow
        Write-Host "  1. Check your internet connection" -ForegroundColor Gray
        Write-Host "  2. Verify GitHub credentials" -ForegroundColor Gray
        Write-Host "  3. Make sure repository exists: $repoUrl" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Press any key to exit..."
        $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
        exit 1
    }
    
    Write-Host ""
    
    # Delay between batches
    if ($i -lt $batches - 1) {
        Write-Host "Waiting 2 seconds before next batch..." -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✓ All batches uploaded successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Repository: $repoUrl" -ForegroundColor Cyan
Write-Host "Total files uploaded: $totalFiles" -ForegroundColor Cyan
Write-Host "Branch: main" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
