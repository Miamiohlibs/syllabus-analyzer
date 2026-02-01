# Setup & Installation Guide

This guide provides complete instructions for setting up the Syllabus Analyzer on your local development environment or production server.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Frontend Installation](#frontend-installation)
4. [Backend Installation](#backend-installation)
5. [Configuration](#configuration)
6. [Running the Application](#running-the-application)
7. [Verification](#verification)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js**: Version 18.x or higher
- **npm** or **pnpm**: Package manager (pnpm recommended)
- **Python**: Version 3.9 or higher
- **pip**: Python package manager
- **Git**: For version control

### Required API Keys

- **OpenAI API Key**: For AI-powered metadata extraction
  - Sign up at [platform.openai.com](https://platform.openai.com)
  - Cost: ~$0.01-0.05 per syllabus processed with o4-mini model

- **Library API Credentials** (Optional for full functionality):
  - Primo API key and configuration (if using Ex Libris Primo)
  - Or credentials for your institution's library system

### System Requirements

- **RAM**: Minimum 4GB (8GB recommended for batch processing)
- **Storage**: 2GB free space minimum (more for large syllabus collections)
- **OS**: macOS, Linux, or Windows (WSL recommended for Windows)

---

## Environment Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd syllabus-analyzer
```

### 2. Project Structure Overview

```
syllabus-analyzer/
├── app/                    # Next.js frontend application
├── backend/               # FastAPI Python backend
│   ├── app.py            # Main API server
│   ├── primo_integration.py
│   ├── downloads/        # Downloaded PDFs storage
│   └── results/          # Extracted metadata results
├── components/           # React UI components
├── scripts/             # Utility scripts
│   ├── florida_pdf_downloader_v2.py
│   ├── polisci_pdf_downloader.py
│   └── syllabus_extractor.py
├── docs/               # Documentation (you are here)
├── .env.example       # Example environment configuration
└── package.json       # Frontend dependencies
```

---

## Frontend Installation

### 1. Install Dependencies

Using pnpm (recommended):
```bash
pnpm install
```

Using npm:
```bash
npm install
```

### 2. Verify Installation

Check that all dependencies installed correctly:
```bash
pnpm list
# or
npm list
```

---

## Backend Installation

### 1. Create Python Virtual Environment

Navigate to the backend directory and create a virtual environment:

```bash
cd backend
python3 -m venv venv
```

### 2. Activate Virtual Environment

**macOS/Linux:**
```bash
source venv/bin/activate
```

**Windows (PowerShell):**
```bash
.\venv\Scripts\Activate.ps1
```

### 3. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 4. Verify Installation

```bash
pip list
```

You should see packages including:
- fastapi
- uvicorn
- openai
- PyMuPDF
- beautifulsoup4
- pandas
- aiohttp

---

## Configuration

### 1. Frontend Configuration

Create environment file:
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
# Backend API Configuration
BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:8000

# Next.js Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 2. Backend Configuration

Navigate to the backend directory:
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-api-key-here

# Primo API Configuration (Optional - for library integration)
PRIMO_API_BASE_URL=https://your-institution.primo.exlibrisgroup.com/primaws/rest/pub/pnxs
PRIMO_API_KEY=your-primo-api-key
PRIMO_VID=your-view-id
PRIMO_TAB=Everything
PRIMO_SCOPE=MyInst_and_CI

# Application Configuration
BACKEND_PORT=8000
FRONTEND_URL=http://localhost:3000
```

### 3. OpenAI API Key Setup

1. Visit [platform.openai.com](https://platform.openai.com)
2. Create an account or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key and paste it into `backend/.env` as `OPENAI_API_KEY`

**Important**: Keep your API key secure. Never commit `.env` files to version control.

### 4. Library API Configuration (Optional)

If you're integrating with Primo or another library system, you'll need:

**For Primo:**
- Contact your Ex Libris representative or IT department
- Request API access credentials
- Obtain your institution's VID (View ID), TAB, and SCOPE parameters
- Configure in `backend/.env`

**For Other Library Systems:**
- See `docs/CUSTOMIZATION.md` for integration guides
- Modify `backend/primo_integration.py` to work with your system's API

---

## Running the Application

### Option 1: Using Start Scripts (Recommended)

The project includes convenient startup scripts.

**Terminal 1 - Start Backend:**
```bash
./start-backend.sh
```

This script:
- Activates the Python virtual environment
- Starts the FastAPI server on port 8000
- Enables auto-reload for development

**Terminal 2 - Start Frontend:**
```bash
./start-frontend.sh
```

This script:
- Starts the Next.js development server on port 3000
- Enables hot module reloading

### Option 2: Manual Start

**Backend (Terminal 1):**
```bash
cd backend
source venv/bin/activate  # or .\venv\Scripts\Activate.ps1 on Windows
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

**Frontend (Terminal 2):**
```bash
# From project root
pnpm dev
# or
npm run dev
```

### Access the Application

Once both servers are running:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs (Swagger UI)

---

## Verification

### 1. Check Frontend

1. Open http://localhost:3000 in your browser
2. You should see the Syllabus Analyzer interface
3. Check the browser console for errors (F12)

### 2. Check Backend

1. Open http://localhost:8000/docs
2. You should see the FastAPI interactive documentation
3. Try the `/api/health` endpoint to verify the server is running

### 3. Test API Connection

From the frontend:
1. The interface should load without errors
2. Department selection buttons should be visible
3. Check browser Network tab to see successful API calls

### 4. Test Basic Functionality

1. Select a department (Arts or Political Science)
2. Click "Start Analysis"
3. Verify that the download process begins
4. Check `backend/downloads/` folder for downloaded PDFs

---

## Troubleshooting

### Frontend Issues

**Port 3000 already in use:**
```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9

# Or use a different port
pnpm dev -- -p 3001
```

**Module not found errors:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules
pnpm install
```

### Backend Issues

**Port 8000 already in use:**
```bash
# Find and kill the process
lsof -ti:8000 | xargs kill -9

# Or change port in start-backend.sh
uvicorn app:app --reload --port 8001
```

**OpenAI API errors:**
- Verify your API key is correct in `backend/.env`
- Check your OpenAI account has available credits
- Ensure no extra spaces in the API key value

**Import errors:**
```bash
# Ensure virtual environment is activated
cd backend
source venv/bin/activate

# Reinstall requirements
pip install -r requirements.txt
```

**PDF download failures:**
- Check internet connection
- Verify the syllabus URL is accessible
- Check `backend/downloads/` folder permissions

### Library Integration Issues

**Primo API not working:**
- Verify all Primo credentials in `backend/.env`
- Test API access with a simple curl command:
```bash
curl "https://your-institution.primo.exlibrisgroup.com/primaws/rest/pub/pnxs?q=any,contains,test&vid=YOUR_VID"
```
- Check API key permissions with your library IT team

### Permission Issues

**Cannot create directories:**
```bash
# Ensure write permissions
chmod -R 755 backend/downloads backend/results
```

### Database/Storage Issues

**Results not saving:**
- Check `backend/results/` folder exists and is writable
- Verify sufficient disk space

---

## Next Steps

Once your installation is verified and working:

1. **Customize for Your Institution**: See `docs/CUSTOMIZATION.md`
2. **Deploy to Production**: See `docs/DEPLOYMENT.md`
3. **Integrate with Your Library System**: See `docs/CUSTOMIZATION.md#library-integration`
4. **Review API Documentation**: See `docs/API.md`

---

## Development Tips

### Hot Reloading

Both frontend and backend support hot reloading during development:
- **Frontend**: Changes to React components reload automatically
- **Backend**: Changes to Python files trigger server restart

### Debugging

**Frontend debugging:**
- Use React Developer Tools browser extension
- Check browser console for errors
- Use `console.log()` statements

**Backend debugging:**
- FastAPI logs appear in the terminal running the backend
- Use Python debugger: `import pdb; pdb.set_trace()`
- Check logs in the backend terminal

### Testing API Endpoints

Use the interactive Swagger UI at http://localhost:8000/docs to:
- Test individual API endpoints
- View request/response schemas
- Debug API issues

---

## Support

If you encounter issues not covered here:
1. Check `docs/TROUBLESHOOTING.md` for common problems
2. Review the API documentation at `docs/API.md`
3. Check the GitHub issues for similar problems
4. Review the code comments in the source files

---

*For production deployment instructions, see `docs/DEPLOYMENT.md`*
