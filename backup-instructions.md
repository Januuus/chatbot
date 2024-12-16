# Backup Instructions

Current files to backup:
```
chatbot/
├── .env.example
├── hostinger-plan.md
├── integration-guide.md
├── package.json
├── README.md
├── render.yaml
├── database/
│   └── schema.sql
└── src/
    ├── claude.js
    ├── config.js
    ├── db.js
    ├── documents.js
    ├── server.js
    └── public/
        └── index.html
```

## How to Create Backup

1. Using Git (Recommended):
```bash
git tag v1.0.0
git push origin v1.0.0
```
This creates a tagged version you can always return to.

2. Manual Backup:
```bash
# Windows (PowerShell)
Compress-Archive -Path * -DestinationPath "chatbot-backup-$(Get-Date -Format 'yyyyMMdd').zip"

# Unix/Linux/Mac
zip -r chatbot-backup-$(date +%Y%m%d).zip ./*
```

## Restore Instructions

1. From Git Tag:
```bash
git checkout v1.0.0
```

2. From ZIP:
- Extract the ZIP file to a new directory
- Run `npm install` to reinstall dependencies

Keep this backup safe before making any further changes.
