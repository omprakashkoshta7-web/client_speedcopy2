# Upload Client to GitHub in Batches
# This script uploads files in batches of 80 to avoid GitHub's 100 file limit

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Client GitHub Upload - Batch Mode" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if git is initialized
if (-not (Test-Path ".git")) {
    Write-Host "Initializing Git repository..." -ForegroundColor Yellow
    git init
    Write-Host "✓ Git initialized" -ForegroundColor Green
}

# Check if remote exists
$remoteExists = git remote get-url origin 2>$null
if (-not $remoteExists) {
    Write-Host ""
    Write-Host "No remote repository found!" -ForegroundColor Red
    Write-Host "Please add your GitHub repository URL:" -ForegroundColor Yellow
    Write-Host "Example: git remote add origin https://github.com/yourusername/speedcopy-client.git" -ForegroundColor Gray
    Write-Host ""
    $repoUrl = Read-Host "Enter your GitHub repository URL"
    
    if ($repoUrl) {
        git remote add origin $repoUrl
        Write-Host "✓ Remote added successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ No URL provided. Exiting..." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Current remote: $(git remote get-url origin)" -ForegroundColor Cyan
Write-Host ""

# Get all untracked and modified files
Write-Host "Scanning files..." -ForegroundColor Yellow
$allFiles = git status --porcelain | ForEach-Object { $_.Substring(3) }
$totalFiles = $allFiles.Count

Write-Host "Found $totalFiles files to upload" -ForegroundColor Cyan
Write-Host ""

if ($totalFiles -eq 0) {
    Write-Host "No files to upload!" -ForegroundColor Green
    exit 0
}

# Calculate number of batches (80 files per batch for safety)
$batchSize = 80
$batches = [Math]::Ceiling($totalFiles / $batchSize)

Write-Host "Will upload in $batches batch(es) of max $batchSize files each" -ForegroundColor Yellow
Write-Host ""

# Upload in batches
for ($i = 0; $i -lt $batches; $i++) {
    $batchNum = $i + 1
    $start = $i * $batchSize
    $end = [Math]::Min(($i + 1) * $batchSize, $totalFiles)
    $batchFiles = $allFiles[$start..($end - 1)]
    $fileCount = $batchFiles.Count
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Batch $batchNum of $batches ($fileCount files)" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    # Add files in this batch
    Write-Host "Adding files..." -ForegroundColor Yellow
    foreach ($file in $batchFiles) {
        git add $file
    }
    
    # Commit this batch
    $commitMsg = "Upload batch $batchNum of $batches - $fileCount files"
    Write-Host "Committing: $commitMsg" -ForegroundColor Yellow
    git commit -m $commitMsg
    
    # Push this batch
    Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
    $branch = git branch --show-current
    if (-not $branch) {
        $branch = "main"
        git branch -M main
    }
    
    git push -u origin $branch
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Batch $batchNum uploaded successfully!" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to upload batch $batchNum" -ForegroundColor Red
        Write-Host "Please check the error above and try again" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host ""
    
    # Small delay between batches
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
Write-Host "Total files uploaded: $totalFiles" -ForegroundColor Cyan
Write-Host "Repository: $(git remote get-url origin)" -ForegroundColor Cyan
Write-Host ""
