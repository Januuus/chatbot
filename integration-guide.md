# Integrating the Chatbot with Your Hostinger Website

## 1. Backend Setup on Hostinger

### 1.1 Database Setup
1. Log into Hostinger control panel
2. Go to MySQL Databases
3. Create new database and user
4. Execute the schema.sql file:
```sql
mysql -u your_db_user -p your_database < database/schema.sql
```

### 1.2 Node.js Setup
1. Go to Hostinger control panel > Node.js
2. Create new Node.js project
3. Note down the assigned port number
4. Set Node.js version to 18.x or higher

### 1.3 Environment Configuration
Create `.env` file with your Hostinger settings:
```env
PORT=your_assigned_port
HOST=localhost
NODE_ENV=production
CORS_ORIGIN=https://your-website-domain.com
DB_HOST=localhost
DB_USER=your_hostinger_db_user
DB_PASSWORD=your_hostinger_db_password
DB_NAME=your_hostinger_db_name
CLAUDE_API_KEY=your_claude_api_key
REQUIRED_API_KEY=your_secure_api_key
```

### 1.4 Deploy Backend
1. Upload project files to Hostinger:
```bash
# Using Git
git clone your-repository
cd your-project
npm install --production

# Or using FTP
Upload all files except node_modules
```

2. Install dependencies:
```bash
npm install --production
```

3. Start the Node.js application:
```bash
npm start
```

## 2. Frontend Integration

### 2.1 Basic Integration
Add this code to your website where you want the chatbot to appear:

```html
<div id="chatbot-container"></div>
<script>
  // Load chatbot interface
  fetch('/src/public/index.html')
    .then(response => response.text())
    .then(html => {
      const container = document.getElementById('chatbot-container');
      container.innerHTML = html;
      
      // Update API configuration
      const API_URL = 'https://your-node-app-url.com/api';
      const API_KEY = 'your-api-key-here';
    });
</script>
```

### 2.2 Custom Styling
You can customize the chatbot's appearance by adding CSS:

```css
/* Custom chatbot styles */
#chat-container {
    /* Your custom styles */
}
```

## 3. Required Code Modifications

### 3.1 Update CORS Configuration
In `src/server.js`, update CORS settings:

```javascript
app.use(cors({
    origin: 'https://your-website-domain.com',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));
```

### 3.2 Update API URL
In `src/public/index.html`, update the API URL:

```javascript
const API_URL = 'https://your-node-app-url.com/api';
const API_KEY = 'your-secure-api-key';
```

## 4. Security Considerations

### 4.1 API Key Protection
1. Generate a secure API key
2. Add it to your .env file
3. Never expose it in frontend code
4. Use environment variables in production

### 4.2 CORS Security
1. Limit CORS to your domain
2. Use HTTPS only
3. Implement rate limiting
4. Validate all inputs

## 5. Testing the Integration

1. Test the connection:
```javascript
fetch(`${API_URL}/health`)
  .then(response => response.json())
  .then(data => console.log('Health check:', data));
```

2. Test file upload:
```javascript
// Send a test message with an image
const formData = new FormData();
formData.append('query', 'Test message');
formData.append('image', imageFile);

fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: {
        'X-API-Key': API_KEY
    },
    body: formData
})
.then(response => response.json())
.then(data => console.log('Response:', data));
```

## 6. Troubleshooting

### Common Issues:

1. CORS Errors:
   - Verify CORS configuration
   - Check domain whitelist
   - Ensure protocols match (http/https)

2. Database Connection:
   - Verify credentials
   - Check connection string
   - Confirm database exists

3. File Upload Issues:
   - Check file size limits
   - Verify allowed file types
   - Check storage permissions

4. API Key Issues:
   - Verify key in requests
   - Check environment variables
   - Confirm key format

## 7. Maintenance

### Regular Tasks:
1. Monitor logs
2. Check database size
3. Update dependencies
4. Backup database
5. Monitor API usage

### Performance Optimization:
1. Enable compression
2. Implement caching
3. Optimize database queries
4. Monitor memory usage

## 8. Support

For issues:
1. Check server logs
2. Review error messages
3. Contact Hostinger support
4. Check Claude API status

Remember to replace all placeholder values (URLs, API keys, etc.) with your actual production values before deploying.
