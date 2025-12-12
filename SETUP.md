# GENEVA Evaluation UI - Setup Guide

A web-based tool for evaluating GENEVA gene prioritization outputs with backend database storage for multiple evaluators.

## Architecture

```
┌─────────────────┐
│   Browser UI    │  Frontend (HTML/CSS/JavaScript)
└────────┬────────┘
         │ REST API
         ▼
┌─────────────────┐
│  Node.js Server │  Express + SQLite
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  SQLite Database│  Persistent storage
└─────────────────┘
```

## Features

✅ **Multi-evaluator support** - Each evaluator has their own account
✅ **Session management** - Different CSV uploads create separate sessions
✅ **Persistent storage** - SQLite database ensures data safety
✅ **Auto-resume** - Return to your work anytime with same Evaluator ID
✅ **Data export** - Download evaluations as CSV
✅ **Audit trail** - Track who evaluated what and when

---

## Quick Start

### 1. Install Node.js

Download and install Node.js (v16 or higher) from https://nodejs.org/

Verify installation:
```bash
node --version
npm --version
```

### 2. Install Dependencies

Navigate to the server directory and install packages:

```bash
cd server
npm install
```

This installs:
- `express` - Web server framework
- `sqlite3` - Database driver
- `cors` - Cross-origin resource sharing
- `body-parser` - Request body parsing

### 3. Start the Server

From the `server/` directory:

```bash
npm start
```

You should see:
```
========================================
GENEVA Evaluation Server Running
========================================
Port: 3000
API: http://localhost:3000/api
UI:  http://localhost:3000/index.html
========================================
```

### 4. Access the Application

Open your browser and go to:
```
http://localhost:3000/index.html
```

---

## Usage Guide

### For Evaluators

#### 1. **Login**
- Enter a unique **Evaluator ID** (e.g., `evaluator_jsmith` or `js_001`)
- Enter your full name
- (Optional) Enter your email
- Click "Sign In"

> **Note:** Use the same Evaluator ID each time to access your previous work.

#### 2. **Upload Files**
Upload your GENEVA output files:
- **Detailed Rankings CSV** (required) - Gene rankings and explanations
- **Summary CSV** (required) - Patient IDs and final rankings
- **Patient Metadata** (optional) - Phenotypes and candidate genes

#### 3. **Evaluate**
- Browse through patient cases and genes
- Review evidence from each source (KG, OMIM, GeneReviews, LLM, Similar Patients)
- Rate each gene using the evaluation form
- Click "Save & Next" to save and move to the next gene

#### 4. **Export Results**
- Click "Export Evaluations" in the header
- Downloads a CSV with all your evaluations

---

### For Administrators

#### View All Evaluations

Download all evaluations from all evaluators:
```
http://localhost:3000/api/export-all
```

#### Database Location

The SQLite database is stored at:
```
server/geneva_evaluations.db
```

**Backup the database regularly!**

```bash
# Simple backup
cp server/geneva_evaluations.db server/geneva_evaluations_backup_$(date +%Y%m%d).db
```

#### Query the Database

```bash
cd server
sqlite3 geneva_evaluations.db

# View all evaluators
SELECT * FROM evaluators;

# View all sessions
SELECT * FROM sessions;

# Count evaluations per evaluator
SELECT s.evaluator_id, COUNT(*) as count
FROM evaluations e
JOIN sessions s ON e.session_id = s.session_id
GROUP BY s.evaluator_id;

# Exit
.quit
```

---

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login or register evaluator

### Sessions
- `POST /api/session` - Create or retrieve session for uploaded files
- `GET /api/session/:sessionId` - Get session details
- `GET /api/sessions/:evaluatorId` - List all sessions for evaluator

### Evaluations
- `POST /api/evaluation` - Save an evaluation
- `GET /api/evaluations/:sessionId` - Get all evaluations for a session

### Export
- `GET /api/export/:evaluatorId` - Export evaluations for one evaluator (CSV)
- `GET /api/export-all` - Export all evaluations from all evaluators (CSV)

---

## Session Management

### How Sessions Work

1. **File Upload** → Files are hashed to create a unique session ID
2. **Same Files** = Same session (can resume work)
3. **Different Files** = New session (separate evaluation run)

### Session ID Format
```
{evaluatorId}_{filesHash}
```

Example: `evaluator_jsmith_a3f8b2c1d4e5`

### Benefits
- Multiple evaluators can work on the same GENEVA run independently
- Each evaluator can have multiple sessions (different GENEVA runs)
- No data mixing between different CSV uploads
- Easy to identify which files were evaluated

---

## Deployment

### Development

```bash
cd server
npm run dev  # Auto-restarts on file changes (requires nodemon)
```

### Production

#### Option 1: Simple Deployment (Same Machine)

```bash
cd server
npm start
```

Keep terminal open or use a process manager like `pm2`:

```bash
npm install -g pm2
pm2 start server.js --name geneva-eval
pm2 save
pm2 startup  # Auto-start on system reboot
```

#### Option 2: Deploy to Cloud

**Heroku:**
1. Create `Procfile` in project root:
   ```
   web: cd server && node server.js
   ```
2. Deploy:
   ```bash
   git init
   git add .
   git commit -m "Deploy GENEVA evaluation"
   heroku create your-app-name
   git push heroku main
   ```

**DigitalOcean/AWS/GCP:**
1. Set up a VM with Node.js
2. Clone your repository
3. Run `npm install` and `npm start`
4. Use nginx as reverse proxy
5. Set up SSL with Let's Encrypt

---

## Configuration

### Change Server Port

Edit `server/server.js`:
```javascript
const PORT = process.env.PORT || 3000;  // Change 3000 to your port
```

Or set environment variable:
```bash
PORT=8080 npm start
```

### Change API URL (Frontend)

Edit `js/api.js`:
```javascript
const API_BASE_URL = 'http://localhost:3000/api';  // Update for production
```

For production deployment:
```javascript
const API_BASE_URL = 'https://your-domain.com/api';
```

---

## Troubleshooting

### Server won't start

**Error:** `Port 3000 already in use`
- Solution: Change port or kill process using port 3000

**Error:** `Cannot find module 'express'`
- Solution: Run `npm install` in the server directory

### Database errors

**Error:** `SQLITE_CANTOPEN: unable to open database file`
- Solution: Check file permissions on server directory

**Error:** `SQLITE_LOCKED: database is locked`
- Solution: Close any other connections to the database

### Login fails

**Error:** `Failed to connect to API`
- Check that server is running
- Check console for network errors (F12 → Console)
- Verify API_BASE_URL in `js/api.js`

### Evaluations not saving

- Check browser console for errors
- Verify session was created successfully
- Check server logs for database errors

---

## Data Safety

### Best Practices

1. **Regular Backups**
   ```bash
   # Daily backup script
   cp server/geneva_evaluations.db backups/geneva_$(date +%Y%m%d).db
   ```

2. **Database Integrity Check**
   ```bash
   sqlite3 server/geneva_evaluations.db "PRAGMA integrity_check;"
   ```

3. **Export Data Regularly**
   - Download exports from `/api/export-all`
   - Store in separate location

4. **Version Control**
   - Commit database backups to git (if small)
   - Or use external backup service

---

## File Structure

```
geneva-ui/
├── index.html              # Main UI
├── styles.css              # All styles
├── js/
│   ├── state.js           # Global state
│   ├── api.js             # API client
│   ├── auth.js            # Authentication
│   ├── file-handler.js    # File upload & parsing
│   ├── data-loader.js     # Data processing
│   ├── ui-renderer.js     # UI updates
│   ├── evaluation-form.js # Form management
│   └── navigation.js      # Navigation & export
├── server/
│   ├── server.js          # Express server
│   ├── db.js              # Database layer
│   ├── package.json       # Dependencies
│   └── geneva_evaluations.db  # SQLite database (auto-created)
├── SETUP.md              # This file
└── README.md             # Project overview
```

---

## Support

### Common Questions

**Q: Can multiple people evaluate the same case?**
A: Yes! Each evaluator has independent evaluations. The admin export shows who evaluated what.

**Q: What happens if I upload the same CSVs again?**
A: The system recognizes identical files and loads your previous evaluations.

**Q: Can I work offline?**
A: No, you need the server running. But you can run the server on your local machine.

**Q: How do I switch between different GENEVA runs?**
A: Just upload different CSV files - the system automatically creates a new session.

**Q: Is my data secure?**
A: Data is stored in a local SQLite database. For production, use HTTPS and proper authentication.

---

## Next Steps

- [x] Backend with database storage ✅
- [x] Multi-evaluator support ✅
- [x] Session management ✅
- [ ] Advanced user roles (admin vs evaluator)
- [ ] Real-time collaboration features
- [ ] PostgreSQL support for larger deployments
- [ ] Export to different formats (JSON, Excel)
- [ ] Data visualization dashboard

---

**Questions or issues?** Check the browser console (F12) and server logs for error messages.
