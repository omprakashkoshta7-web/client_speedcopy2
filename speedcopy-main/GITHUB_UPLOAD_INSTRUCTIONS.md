# Upload Client to GitHub

## Repository
**URL:** https://github.com/snehakoshta/speedcopy_agu.git

## Quick Upload

### Option 1: Double-click the batch file
Simply double-click `UPLOAD_TO_GITHUB.bat` in the client folder.

### Option 2: Run PowerShell script
```powershell
cd client
powershell -ExecutionPolicy Bypass -File upload-to-sneha-repo.ps1
```

### Option 3: Manual Git commands
```bash
cd client
git init
git remote add origin https://github.com/snehakoshta/speedcopy_agu.git
git add .
git commit -m "Upload client code"
git push -u origin main
```

## What the script does:
1. ✅ Initializes Git repository if needed
2. ✅ Configures remote to https://github.com/snehakoshta/speedcopy_agu.git
3. ✅ Uploads files in batches (80 files per batch)
4. ✅ Shows progress for each batch
5. ✅ Handles large file uploads efficiently

## Before uploading:
- Make sure you have Git installed
- Ensure you're logged into GitHub
- Verify the repository exists and you have write access

## After uploading:
Visit: https://github.com/snehakoshta/speedcopy_agu

## Troubleshooting:
- **Authentication error**: Run `git config --global credential.helper wincred`
- **Permission denied**: Check repository access rights
- **Large files**: The script automatically batches uploads
