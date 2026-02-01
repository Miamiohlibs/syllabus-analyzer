# Troubleshooting Guide

Common issues and solutions for the Syllabus Analyzer.

---

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Runtime Errors](#runtime-errors)
3. [PDF Processing Issues](#pdf-processing-issues)
4. [API Integration Issues](#api-integration-issues)
5. [Performance Issues](#performance-issues)
6. [Data Issues](#data-issues)

---

## Installation Issues

### Node.js Dependencies Won't Install

**Error**: `npm ERR! code ERESOLVE` or dependency conflicts

**Solutions**:
```bash
# Try using legacy peer deps
npm install --legacy-peer-deps

# Or force install
npm install --force

# Clear cache first if needed
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**Switch to pnpm** (recommended):
```bash
npm install -g pnpm
pnpm install
```

### Python Virtual Environment Issues

**Error**: `command not found: python3` or `No module named venv`

**Solutions**:

**macOS**:
```bash
# Install Python via Homebrew
brew install python@3.11

# Or use system Python
python3 -m pip install --upgrade pip
```

**Ubuntu/Debian**:
```bash
sudo apt update
sudo apt install python3.11 python3.11-venv python3-pip
```

**Windows**:
- Download Python from python.org
- Ensure "Add Python to PATH" is checked during installation

### pip Install Fails

**Error**: `ERROR: Could not build wheels for PyMuPDF`

**Solutions**:

Install system dependencies first:

**macOS**:
```bash
brew install mupdf-tools
```

**Ubuntu/Debian**:
```bash
sudo apt install python3-dev libmupdf-dev
```

**Windows**:
- Install Microsoft C++ Build Tools
- Or use pre-built wheels: `pip install --prefer-binary PyMuPDF`

---

## Runtime Errors

### Frontend Won't Start

**Error**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)

# Or use different port
pnpm dev -- -p 3001
```

### Backend Won't Start

**Error**: `ModuleNotFoundError: No module named 'fastapi'`

**Solution**:
```bash
# Ensure virtual environment is activated
cd backend
source venv/bin/activate  # macOS/Linux
# or
.\venv\Scripts\Activate.ps1  # Windows

# Reinstall dependencies
pip install -r requirements.txt
```

**Error**: `Address already in use` on port 8000

**Solution**:
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Or change port in start-backend.sh
uvicorn app:app --reload --port 8001
```

### Environment Variables Not Loading

**Error**: `OPENAI_API_KEY` not found or API calls failing

**Solution**:

1. Verify `.env` file exists in backend directory:
```bash
ls -la backend/.env
```

2. Check file contents (redact API key):
```bash
cat backend/.env | grep OPENAI_API_KEY
```

3. Ensure no extra spaces:
```env
# WRONG
OPENAI_API_KEY = sk-your-key

# CORRECT
OPENAI_API_KEY=sk-your-key
```

4. Restart backend after changing `.env`:
```bash
# Kill existing process
pkill -f uvicorn

# Restart
./start-backend.sh
```

---

## PDF Processing Issues

### PDF Downloads Failing

**Error**: `Failed to download PDF: Connection timeout`

**Causes & Solutions**:

1. **Network Issues**:
```bash
# Test connectivity
curl -I https://arts.ufl.edu/syllabi/

# Check firewall/proxy settings
```

2. **Invalid URL Structure**:
- Verify the syllabus repository URL is accessible
- Check if website requires authentication
- Ensure URL doesn't have trailing redirects

3. **Rate Limiting**:
- Website may be blocking automated requests
- Reduce `max_workers` in downloader
- Add delays between requests

**Modify downloader**:
```python
# In your downloader class
import time

def download_pdf(self, url):
    time.sleep(1)  # Add 1 second delay
    # ... rest of download logic
```

### No PDFs Found

**Error**: `Found 0 PDF links`

**Solutions**:

1. **Verify URL manually**:
- Open the URL in browser
- Confirm PDFs are actually linked there
- Check if PDFs are behind login/authentication

2. **Inspect HTML structure**:
```python
# Test your downloader
from your_downloader import Downloader

downloader = Downloader(base_url="https://example.edu/syllabi/")
links = downloader.get_semester_links()
print(f"Semester links found: {links}")

pdf_links = downloader.get_pdf_links_from_page(links[0])
print(f"PDF links found: {pdf_links}")
```

3. **Update HTML selectors**:
- Website structure may have changed
- Update CSS selectors in `get_pdf_links_from_page()`
- See `docs/CUSTOMIZATION.md` for guidance

### PDF Extraction Fails

**Error**: `Failed to extract text from PDF` or empty text returned

**Causes**:

1. **Scanned/Image PDFs**: Text is embedded as images
2. **Corrupted PDFs**: File is damaged
3. **Protected PDFs**: Password-protected or restricted

**Solutions**:

1. **Check PDF manually**:
```bash
# Try opening PDF
open backend/downloads/problematic_file.pdf
```

2. **For scanned PDFs**, add OCR:
```bash
pip install pytesseract
brew install tesseract  # macOS
# or
sudo apt install tesseract-ocr  # Ubuntu
```

Update extractor:
```python
import pytesseract
from PIL import Image
import fitz

def extract_text_with_ocr(pdf_path):
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        # Try text extraction first
        page_text = page.get_text()
        if not page_text.strip():
            # If no text, use OCR
            pix = page.get_pixmap()
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            page_text = pytesseract.image_to_string(img)
        text += page_text
    return text
```

3. **Skip problematic files**:
```python
# Add error handling
try:
    text = extract_text_from_pdf(pdf_path)
    if not text or len(text) < 100:
        print(f"Skipping {pdf_path}: Insufficient text")
        continue
except Exception as e:
    print(f"Error with {pdf_path}: {e}")
    continue
```

---

## API Integration Issues

### OpenAI API Errors

**Error**: `AuthenticationError: Incorrect API key`

**Solution**:
1. Verify API key in `backend/.env`
2. Check for extra spaces or quotes
3. Generate new API key at platform.openai.com
4. Ensure account has available credits

**Error**: `RateLimitError: Rate limit exceeded`

**Solutions**:
1. **Slow down requests**:
```python
# In extraction code
import time
time.sleep(2)  # Wait 2 seconds between API calls
```

2. **Upgrade OpenAI tier**: Visit platform.openai.com/account/limits

3. **Batch processing**:
```python
# Process in smaller batches
batch_size = 5
for i in range(0, len(files), batch_size):
    batch = files[i:i+batch_size]
    process_batch(batch)
    time.sleep(10)  # Pause between batches
```

**Error**: `Invalid model: o4-mini`

**Solution**:
Model name may have changed. Update in `scripts/syllabus_extractor.py`:
```python
# Try alternative models
LLM_MODEL = "gpt-4o-mini"  # or "gpt-4", "gpt-3.5-turbo"
```

### Primo API Not Working

**Error**: `401 Unauthorized` or `403 Forbidden`

**Solutions**:

1. **Verify credentials**:
```bash
# Test API directly
curl "https://your-institution.primo.exlibrisgroup.com/primaws/rest/pub/pnxs?q=any,contains,biology&vid=YOUR_VID&tab=Everything&scope=MyInst"
```

2. **Check environment variables**:
```bash
cat backend/.env | grep PRIMO
```

3. **Verify VID, TAB, SCOPE**:
- Contact your library IT department
- These values are institution-specific
- May have changed since initial configuration

4. **API key permissions**:
- Ensure API key has search permissions
- May need to be regenerated

**Error**: `No results found` for all searches

**Causes**:
1. Wrong SCOPE or TAB configuration
2. Query format incompatible with your Primo instance
3. Collection not indexed

**Debug**:
```python
# Add logging to primo_integration.py
import logging
logging.basicConfig(level=logging.DEBUG)

# Log actual API calls
logger.debug(f"Querying Primo: {url}")
logger.debug(f"Response: {response.status_code}")
logger.debug(f"Body: {await response.text()}")
```

---

## Performance Issues

### Slow Metadata Extraction

**Symptoms**: Processing takes hours for small number of PDFs

**Causes & Solutions**:

1. **OpenAI API throttling**:
- Add progress indicators to monitor
- Implement retry with exponential backoff

2. **Large PDFs**:
```python
# Truncate very long PDFs
MAX_CHARS = 50000  # ~15k tokens
if len(pdf_text) > MAX_CHARS:
    pdf_text = pdf_text[:MAX_CHARS]
```

3. **Concurrent processing**:
```python
from concurrent.futures import ThreadPoolExecutor

def process_pdf(pdf_path):
    # extraction logic
    pass

with ThreadPoolExecutor(max_workers=3) as executor:
    executor.map(process_pdf, pdf_files)
```

### High Memory Usage

**Symptoms**: System freezes, out of memory errors

**Solutions**:

1. **Process in batches**:
```python
# Don't load all PDFs at once
for pdf_file in pdf_files:
    result = process_pdf(pdf_file)
    save_result(result)
    del result  # Free memory
```

2. **Reduce workers**:
```bash
# In start-backend.sh
uvicorn app:app --workers 1  # Reduce from 4
```

3. **Clear old downloads**:
```bash
# Clean up old job folders
find backend/downloads -type d -mtime +7 -exec rm -rf {} +
```

### Slow Library Matching

**Symptoms**: Library API checks take very long

**Solutions**:

1. **Parallel queries**:
Already implemented with `asyncio`, but ensure:
```python
# Check semaphore limit
semaphore = asyncio.Semaphore(10)  # Max 10 concurrent
```

2. **Cache results**:
```python
from functools import lru_cache

@lru_cache(maxsize=1000)
def search_library(title, author):
    # Search logic
    pass
```

3. **Skip already-available resources**:
```python
# Don't query library for items with direct URLs
if material.get('url') not in ['Unknown', '', None]:
    continue  # Skip library search
```

---

## Data Issues

### Inaccurate Metadata Extraction

**Symptoms**: Wrong course names, missing information

**Solutions**:

1. **Improve prompts** in `scripts/syllabus_extractor.py`:
```python
user_prompt = f"""
Extract information from this syllabus. Be precise and accurate.

IMPORTANT RULES:
- If information is not found, return "Unknown"
- Extract course codes exactly as written (e.g., "BIO 101" not "Biology 101")
- For reading materials, include ALL books, articles, and resources mentioned
- Capture author names exactly as they appear

Syllabus text:
{pdf_text}
"""
```

2. **Use better model**:
```python
LLM_MODEL = "gpt-4"  # More accurate but more expensive
```

3. **Post-processing validation**:
```python
def validate_metadata(metadata):
    # Check for common issues
    if metadata.get('year') and not metadata['year'].isdigit():
        metadata['year'] = extract_year_from_text(raw_text)
    
    # Validate course number format
    if metadata.get('class_number'):
        metadata['class_number'] = normalize_course_code(metadata['class_number'])
    
    return metadata
```

### Missing Reading Materials

**Symptoms**: `reading_materials` array is empty but syllabus has readings

**Causes**:
1. Readings in tables (not extracted properly)
2. Unusual formatting
3. Reading list on separate page/document

**Solutions**:

1. **Extract tables separately**:
```python
tables = extract_tables_from_pdf(pdf_path)
combined_text = pdf_text + "\n\nTABLES:\n" + "\n".join(tables)
```

2. **Update prompt**:
```python
user_prompt = f"""
Pay special attention to reading materials. They may appear:
- In a "Required Readings" section
- In a schedule/calendar table
- In a bibliography
- As footnotes or references

Extract ALL mentioned books, articles, websites, videos, and other resources.
"""
```

### Duplicate Results

**Symptoms**: Same PDF processed multiple times

**Solutions**:

```python
# In downloader
def download_pdf(self, url):
    filename = self.sanitize_filename(url)
    
    # Check if already downloaded
    if filename in self.downloaded_files:
        return
    
    if (self.download_folder / filename).exists():
        print(f"Already exists: {filename}")
        return
    
    # ... download logic
```

### Library Matches Not Found

**Symptoms**: No matches even though resources exist in library

**Causes**:
1. Title/author mismatch
2. Different editions
3. Wrong search parameters

**Solutions**:

1. **Fuzzy matching**:
```python
from fuzzywuzzy import fuzz

def fuzzy_match_title(query_title, result_title):
    ratio = fuzz.ratio(query_title.lower(), result_title.lower())
    return ratio > 80  # 80% similarity threshold
```

2. **Try multiple queries**:
```python
# Try with and without subtitle
queries = [
    full_title,
    full_title.split(':')[0],  # Remove subtitle
    full_title.split('(')[0],  # Remove edition info
]

for query in queries:
    result = await search_library(query)
    if result['found']:
        return result
```

3. **Search by ISBN if available**:
```python
if material.get('isbn'):
    result = await search_by_isbn(material['isbn'])
```

---

## Debugging Tips

### Enable Verbose Logging

**Backend**:
```python
# In backend/app.py
import logging

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

**Frontend**:
```typescript
// In app/page.tsx
console.log('Job status:', currentJob)
console.log('Extraction results:', extractedResults)
```

### Test Individual Components

**Test PDF download**:
```bash
cd scripts
python3 -c "
from florida_pdf_downloader_v2 import UFLSyllabiDownloader
d = UFLSyllabiDownloader('https://arts.ufl.edu/syllabi/', 'test_downloads')
d.run(max_pdfs=5)
"
```

**Test extraction**:
```bash
cd backend
python3 -c "
from scripts.syllabus_extractor import extract_text_from_pdf, call_llm_for_metadata
text = extract_text_from_pdf('downloads/test.pdf')
metadata = call_llm_for_metadata(text)
print(metadata)
"
```

**Test library API**:
```bash
cd backend
python3 -c "
import asyncio
from primo_integration import check_metadata_availability
metadata = {'reading_materials': [{'title': 'Test Book', 'creator': 'Test Author'}]}
result = asyncio.run(check_metadata_availability(metadata))
print(result)
"
```

### Check Logs

**Backend logs**:
```bash
# If running with start-backend.sh
tail -f backend/app.log

# Or check console output
```

**Frontend logs**:
- Open browser console (F12)
- Check Network tab for failed API calls
- Look for JavaScript errors in Console tab

### Database of Processed Files

Track what's been processed:
```python
import json

def save_processing_log(job_id, filename, status, metadata=None):
    log_file = f"backend/logs/{job_id}.json"
    
    log_entry = {
        'filename': filename,
        'status': status,
        'timestamp': datetime.now().isoformat(),
        'metadata': metadata
    }
    
    with open(log_file, 'a') as f:
        json.dump(log_entry, f)
        f.write('\n')
```

---

## Getting Help

If issues persist:

1. **Check existing documentation**:
   - `README.md`: Overview and getting started
   - `docs/SETUP.md`: Installation details
   - `docs/API.md`: API reference
   - `docs/CUSTOMIZATION.md`: Customization guides

2. **Review code comments**: The codebase is well-documented

3. **Test with minimal example**: Isolate the problem

4. **Check API service status**:
   - OpenAI status: status.openai.com
   - Your library API status page

5. **Search error messages**: Copy exact error message and search

6. **Create reproducible example**: Minimal code that demonstrates the issue

---

## Common Error Messages Quick Reference

| Error | Likely Cause | Quick Fix |
|-------|--------------|-----------|
| `EADDRINUSE` | Port in use | Kill process or use different port |
| `ModuleNotFoundError` | Missing dependency | `pip install -r requirements.txt` |
| `AuthenticationError` | Wrong API key | Check `backend/.env` |
| `Connection timeout` | Network issue | Check internet, firewall |
| `Invalid JSON` | Malformed API response | Update parsing logic |
| `Permission denied` | File permissions | `chmod 755` on directories |
| `Out of memory` | Too many concurrent jobs | Reduce workers, process in batches |
| `404 Not Found` | Wrong URL or endpoint | Verify API endpoint |
| `Empty results` | No PDFs found | Check URL, update selectors |

---

*If you've found a bug or have a solution not listed here, consider contributing to this documentation!*
