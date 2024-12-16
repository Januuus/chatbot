# Claude 3.5 Chatbot with Document and Image Processing

A Node.js application that provides a chatbot interface powered by Claude 3.5 Sonnet with document and image processing capabilities.

## Features

- Chat interface with Claude 3.5 Sonnet API
- Document processing (PDF, DOCX, TXT)
- Image processing with OCR (JPEG, PNG, WebP, GIF)
- Context-aware responses based on uploaded files
- Conversation history tracking
- Document and image search functionality
- Rate limiting and security measures
- Production-ready for Hostinger deployment

## Supported File Types

### Documents
- PDF files (application/pdf)
- Word documents (docx)
- Text files (txt)

### Images
- JPEG/JPG (image/jpeg)
- PNG (image/png)
- WebP (image/webp)
- GIF (image/gif)

## Image Processing Features
- Automatic OCR (Optical Character Recognition)
- Image optimization before processing
- Text extraction from images
- Image content searchable alongside documents
- Original image storage in base64 format
- Configurable image quality and dimensions

## Project Structure

```
chatbot/
├── src/
│   ├── config.js           # Configuration management
│   ├── claude.js           # Claude API integration
│   ├── db.js              # Database operations
│   ├── documents.js        # Document and image processing
│   └── server.js          # Express server
├── database/
│   └── schema.sql         # MySQL schema
├── .env.example           # Environment variables template
└── package.json          # Dependencies
```

## Prerequisites

- Node.js >= 18.0.0
- MySQL database (provided by Hostinger)
- Claude API key from Anthropic
- Hostinger hosting account
- Tesseract.js for OCR
- Sharp for image processing

## Local Development Setup

1. Install dependencies:
```bash
npm install
```

2. Create MySQL database using schema:
```bash
mysql -u your_user -p your_database < database/schema.sql
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your local configuration
```

4. Start development server:
```bash
npm run dev
```

## API Endpoints

### Chat Endpoint
```http
POST /api/chat
Content-Type: application/json
X-API-Key: your_api_key

{
  "query": "Your question here",
  "includeContext": true
}
```

### File Upload (Documents & Images)
```http
POST /api/documents
Content-Type: multipart/form-data
X-API-Key: your_api_key

file: your_file  # Can be document or image
```

### File Search
```http
GET /api/documents/search?query=your_search_term
X-API-Key: your_api_key
```

### Get File
```http
GET /api/documents/:id
X-API-Key: your_api_key
```

### Conversation History
```http
GET /api/conversations?limit=10
X-API-Key: your_api_key
```

## Image Processing Configuration

Configure image processing in your .env file:
```env
MAX_IMAGE_WIDTH=2048
MAX_IMAGE_HEIGHT=2048
IMAGE_QUALITY=80
OCR_LANGUAGE=eng
```

## Hostinger Deployment Guide

### 1. Database Setup

1. Log in to Hostinger control panel
2. Go to "MySQL Databases"
3. Create a new database and user
4. Note down the credentials:
   - Database name
   - Username
   - Password
   - Host (usually localhost)

### 2. Application Deployment

1. In Hostinger control panel:
   - Go to "Node.js" section
   - Create new Node.js project
   - Note the assigned port number

2. Connect to Hostinger via SSH:
```bash
ssh u123456789@your-hostname
```

3. Navigate to your project directory:
```bash
cd domains/your-domain/public_html
```

4. Upload project files:
   - Use Git:
     ```bash
     git clone your-repository
     cd your-project
     ```
   - Or upload via FTP

5. Install dependencies:
```bash
npm install --production
```

6. Create and configure .env:
```bash
cp .env.example .env
nano .env
```

## File Upload Limits

- Maximum file size: 10MB (configurable)
- Supported image formats: JPEG, PNG, WebP, GIF
- Supported document formats: PDF, DOCX, TXT

## Security Considerations

1. Always use HTTPS in production
2. Set secure API keys
3. Configure CORS appropriately
4. Use rate limiting
5. Keep dependencies updated
6. Monitor logs regularly
7. Validate file uploads
8. Sanitize image data

## Error Handling

The application includes comprehensive error handling for:
- File upload failures
- OCR processing errors
- Image optimization issues
- Database operations
- API rate limits
- Invalid file types

## Performance Optimization

1. Image Processing:
   - Automatic image optimization
   - Configurable quality settings
   - Memory-efficient processing

2. OCR:
   - Pre-processing for better accuracy
   - Language support configuration
   - Caching of results

## Monitoring

1. Check application logs:
```bash
tail -f ~/.pm2/logs/app-name-out.log
```

2. Monitor errors:
```bash
tail -f ~/.pm2/logs/app-name-error.log
```

## Troubleshooting

1. Image Processing Issues:
   - Verify Tesseract.js installation
   - Check image dimensions and format
   - Verify memory limits
   - Check OCR language support

2. Upload Problems:
   - Verify file size limits
   - Check storage permissions
   - Confirm supported file types

3. API Errors:
   - Validate API key configuration
   - Check Claude API status
   - Verify rate limits

## Support

For issues related to:
- Hosting: Contact Hostinger support
- Claude API: Check Anthropic documentation
- Application: Create an issue in the repository
- OCR: Consult Tesseract.js documentation

## License

MIT License - Feel free to use and modify for your needs.
