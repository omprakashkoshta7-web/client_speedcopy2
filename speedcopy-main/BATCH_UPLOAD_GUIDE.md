# Client Folder - Batch Upload to GitHub

## Problem
GitHub web interface doesn't allow uploading more than 100 files at once.

## Solution
Use the batch upload script that uploads files in chunks of 80.

## Steps

### Option 1: Using Batch File (Easiest)
1. Double-click `upload-in-batches.bat`
2. Enter your GitHub repository URL when prompted (first time only)
3. Wait for all batches to upload
4. Done! ✓

### Option 2: Using PowerShell
1. Open PowerShell in the `client` folder
2. Run: `.\upload-in-batches.ps1`
3. Enter your GitHub repository URL when prompted (first time only)
4. Wait for all batches to upload
5. Done! ✓

### Option 3: Manual Git Commands
If you prefer manual control:

```bash
# Initialize git (if not already done)
git init

# Add remote (replace with your repo URL)
git remote add origin https://github.com/yourusername/speedcopy-client.git

# Add files in batches
git add src/components/*.tsx
git commit -m "Add components"
git push -u origin main

git add src/pages/*.tsx
git commit -m "Add pages"
git push

git add src/services/*.ts
git commit -m "Add services"
git push

# Continue for other folders...
```

## What the Script Does

1. **Scans** all modified and untracked files
2. **Divides** them into batches of 80 files
3. **Commits** each batch separately
4. **Pushes** each batch to GitHub
5. **Waits** 2 seconds between batches to avoid rate limits

## Features

✅ Automatic batch size management (80 files per batch)
✅ Progress tracking (Batch X of Y)
✅ Error handling
✅ Automatic branch detection
✅ Remote repository setup
✅ Safe delays between uploads

## First Time Setup

When you run the script for the first time:

1. It will ask for your GitHub repository URL
2. Enter: `https://github.com/yourusername/speedcopy-client.git`
3. The script will save this and use it for all future uploads

## Troubleshooting

### "Permission denied" error
Run PowerShell as Administrator

### "Remote already exists" error
The script handles this automatically. If you see this, it's safe to ignore.

### "Failed to push" error
- Check your internet connection
- Verify your GitHub credentials
- Make sure the repository exists on GitHub

### Want to change repository URL?
```bash
git remote set-url origin https://github.com/newusername/new-repo.git
```

## Notes

- The script preserves your commit history
- Each batch gets its own commit message
- You can safely stop and resume the upload
- Already uploaded files won't be uploaded again

## Example Output

```
========================================
Client GitHub Upload - Batch Mode
========================================

Found 250 files to upload
Will upload in 4 batch(es) of max 80 files each

========================================
Batch 1 of 4 (80 files)
========================================
Adding files...
Committing: Upload batch 1 of 4 - 80 files
Pushing to GitHub...
✓ Batch 1 uploaded successfully!

[... continues for all batches ...]

========================================
✓ All batches uploaded successfully!
========================================

Total files uploaded: 250
```
