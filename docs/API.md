# API Reference Documentation

Complete reference for the Syllabus Analyzer REST API endpoints.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URL](#base-url)
4. [Endpoints](#endpoints)
5. [Data Models](#data-models)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)

---

## Overview

The Syllabus Analyzer API is a RESTful service built with FastAPI that provides endpoints for:
- Syllabus discovery and download
- PDF metadata extraction
- Library resource matching
- Job status tracking
- Result export

**Interactive Documentation**: Access live API docs at `http://localhost:8000/docs` (Swagger UI) or `http://localhost:8000/redoc` (ReDoc).

---

## Authentication

**Current Version**: No authentication required (suitable for internal institutional use)

**Production Recommendations**:
- Implement API key authentication
- Use institutional SSO integration
- Add rate limiting per user/IP

---

## Base URL

**Development**: `http://localhost:8000`  
**Production**: `https://api.yourdomain.edu`

All endpoints are prefixed with `/api/` unless otherwise noted.

---

## Endpoints

### Health Check

#### `GET /api/health`

Check if the API server is running.

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-31T22:30:00Z"
}
```

---

### Metadata Fields

#### `GET /api/metadata-fields`

Get available metadata fields that can be extracted from syllabi.

**Response**:
```json
{
  "fields": [
    {
      "id": "year",
      "label": "Year",
      "description": "Academic year"
    },
    {
      "id": "semester",
      "label": "Semester",
      "description": "Term (Fall, Spring, Summer)"
    },
    {
      "id": "class_name",
      "label": "Course Name",
      "description": "Full course title"
    },
    {
      "id": "class_number",
      "label": "Course Number",
      "description": "Course code (e.g., BIO101)"
    },
    {
      "id": "instructor",
      "label": "Instructor",
      "description": "Professor name"
    },
    {
      "id": "university",
      "label": "University",
      "description": "Institution name"
    },
    {
      "id": "main_topic",
      "label": "Main Topic",
      "description": "Course subject matter"
    },
    {
      "id": "reading_materials",
      "label": "Reading Materials",
      "description": "Required/recommended resources"
    }
  ]
}
```

---

### Job Management

#### `POST /api/discover-syllabi`

Start a new job to discover and download syllabi from a URL.

**Request Body**:
```json
{
  "url": "https://arts.ufl.edu/syllabi/",
  "job_name": "Fall 2024 Arts Syllabi",
  "department": "arts"
}
```

**Parameters**:
- `url` (string, required): Base URL to discover syllabi
- `job_name` (string, optional): Human-readable job name
- `department` (string, required): Department type - `"arts"` or `"polisci"`

**Response**:
```json
{
  "job_id": "abc123def456",
  "status": "pending",
  "message": "Job created successfully"
}
```

**Status Codes**:
- `200`: Job created successfully
- `400`: Invalid input
- `500`: Server error

---

#### `GET /api/job-status/{job_id}`

Get the current status of a job.

**Parameters**:
- `job_id` (path parameter): UUID of the job

**Response**:
```json
{
  "job_id": "abc123def456",
  "status": "downloading",
  "progress": 45,
  "message": "Downloaded 23 of 50 PDFs",
  "files_found": 50,
  "files_downloaded": 23,
  "files_processed": 0,
  "selected_fields": null,
  "results_file": null,
  "primo_results_file": null
}
```

**Job Status Values**:
- `pending`: Job created, not started
- `downloading`: Downloading PDFs from source
- `processing`: Extracting metadata from PDFs
- `completed`: Job finished successfully
- `error`: Job failed
- `failed`: Job failed with errors

**Progress**: Integer from 0-100 representing completion percentage

---

#### `GET /api/jobs`

List all jobs (most recent first).

**Response**:
```json
{
  "jobs": [
    {
      "job_id": "abc123",
      "status": "completed",
      "progress": 100,
      "message": "Completed successfully",
      "files_found": 50,
      "files_downloaded": 50,
      "files_processed": 50
    },
    {
      "job_id": "def456",
      "status": "processing",
      "progress": 75,
      "message": "Processing PDFs",
      "files_found": 30,
      "files_downloaded": 30,
      "files_processed": 22
    }
  ]
}
```

---

### Metadata Extraction

#### `POST /api/extract-metadata`

Extract metadata from downloaded PDFs for a specific job.

**Request Body**:
```json
{
  "job_id": "abc123def456",
  "selected_fields": [
    "year",
    "semester",
    "class_name",
    "class_number",
    "instructor",
    "reading_materials"
  ]
}
```

**Parameters**:
- `job_id` (string, required): ID of completed download job
- `selected_fields` (array, required): List of metadata field IDs to extract

**Response**:
```json
{
  "message": "Extraction started",
  "job_id": "abc123def456"
}
```

**Note**: This is an asynchronous operation. Use the job status endpoint to track progress.

---

#### `GET /api/extraction-progress/{job_id}`

Get real-time extraction progress for a job.

**Response**:
```json
{
  "job_id": "abc123def456",
  "status": "processing",
  "progress": 67,
  "message": "Processing file 20 of 30",
  "files_processed": 20,
  "total_files": 30,
  "current_file": "BIO101_Fall2024.pdf"
}
```

---

### Results

#### `GET /api/results/{job_id}`

Get extracted metadata results for a completed job.

**Response**:
```json
{
  "job_id": "abc123def456",
  "results": [
    {
      "filename": "BIO101_Fall2024.pdf",
      "metadata": {
        "year": "2024",
        "semester": "Fall",
        "class_name": "Introduction to Biology",
        "class_number": "BIO 101",
        "instructor": "Dr. Jane Smith",
        "university": "University of Florida",
        "main_topic": "Fundamentals of cellular and molecular biology",
        "reading_materials": [
          {
            "title": "Campbell Biology",
            "creator": "Jane Reece",
            "type": "book",
            "requirement": "required",
            "url": "Unknown"
          }
        ]
      },
      "library_matches": [
        {
          "originalQuery": "Campbell Biology",
          "matchScore": 0.9,
          "matches": [
            {
              "title": "Campbell Biology, 12th Edition",
              "authors": ["Jane B. Reece", "Lisa A. Urry"],
              "isbn": "9780135188743",
              "availability": "available",
              "format": "Book",
              "location": "Marston Science Library",
              "callNumber": "QH308.2 .C34 2021",
              "link": "https://catalog.library.ufl.edu/item/12345",
              "coverImage": "https://covers.example.com/12345.jpg",
              "dueDate": null
            }
          ]
        }
      ]
    }
  ]
}
```

---

#### `GET /api/download-results/{job_id}`

Download results as a file (JSON or CSV).

**Query Parameters**:
- `format` (string, optional): `"json"` or `"csv"` (default: `"json"`)

**Response**: File download

**Example**:
```
GET /api/download-results/abc123?format=csv
```

Downloads a CSV file with all extracted metadata.

---

### Library Integration

#### `POST /api/check-library-availability`

Check library availability for reading materials in a job's results.

**Request Body**:
```json
{
  "job_id": "abc123def456"
}
```

**Response**:
```json
{
  "message": "Library check started",
  "job_id": "abc123def456"
}
```

**Note**: This is an asynchronous operation that queries the library API for each reading material.

---

#### `GET /api/library-matching-progress/{job_id}`

Get progress of library availability checking.

**Response**:
```json
{
  "job_id": "abc123def456",
  "status": "processing",
  "progress": 45,
  "message": "Checking resource 23 of 50",
  "items_checked": 23,
  "total_items": 50,
  "matches_found": 18
}
```

---

### File Management

#### `POST /api/upload-pdf`

Upload a single PDF for analysis (alternative to URL discovery).

**Request**: Multipart form data
- `file`: PDF file
- `job_name` (optional): Name for this upload

**Response**:
```json
{
  "job_id": "xyz789",
  "filename": "uploaded_syllabus.pdf",
  "message": "File uploaded successfully"
}
```

---

#### `DELETE /api/job/{job_id}`

Delete a job and its associated files.

**Response**:
```json
{
  "message": "Job deleted successfully",
  "job_id": "abc123def456"
}
```

---

## Data Models

### JobStatus

```typescript
interface JobStatus {
  job_id: string
  status: "pending" | "downloading" | "processing" | "completed" | "error" | "failed"
  progress: number  // 0-100
  message: string
  files_found?: number
  files_downloaded?: number
  files_processed?: number
  selected_fields?: string[]
  results_file?: string
  primo_results_file?: string
}
```

### ExtractedMetadata

```typescript
interface ExtractedMetadata {
  filename: string
  metadata: {
    year?: string
    semester?: string
    class_name?: string
    class_number?: string
    instructor?: string
    university?: string
    main_topic?: string
    reading_materials?: ReadingMaterial[]
  }
  library_matches?: LibraryMatch[]
}
```

### ReadingMaterial

```typescript
interface ReadingMaterial {
  title: string
  creator: string  // Author/creator name
  type: string  // "book" | "article" | "video" | "website" | "other"
  requirement: string  // "required" | "recommended" | "optional" | "equipment"
  url: string  // Direct URL if available, otherwise "Unknown"
  isbn?: string
  media_type?: string
}
```

### LibraryMatch

```typescript
interface LibraryMatch {
  originalQuery: string  // Title that was searched
  matchScore: number  // 0.0 to 1.0 confidence score
  matches: LibraryResource[]
  note?: string  // Additional information about the match
}
```

### LibraryResource

```typescript
interface LibraryResource {
  title: string
  authors: string[]
  isbn: string
  availability: "available" | "checked_out" | "unavailable"
  format: string  // "Book" | "eBook" | "Journal Article" | "Video" | etc.
  location: string  // Physical or virtual location
  callNumber: string  // Library call number
  link: string  // URL to catalog record
  coverImage?: string  // URL to cover image
  dueDate?: string  // ISO date string if checked out
}
```

---

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "detail": "Error message description",
  "error_code": "ERROR_TYPE",
  "timestamp": "2025-01-31T22:30:00Z"
}
```

### Common HTTP Status Codes

- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid input parameters
- **404 Not Found**: Resource not found
- **422 Unprocessable Entity**: Validation error
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server-side error
- **503 Service Unavailable**: Service temporarily unavailable

### Error Examples

**Invalid Job ID**:
```json
{
  "detail": "Job not found",
  "error_code": "JOB_NOT_FOUND"
}
```

**Invalid URL**:
```json
{
  "detail": "Invalid URL format",
  "error_code": "INVALID_URL"
}
```

**Missing API Key**:
```json
{
  "detail": "OpenAI API key not configured",
  "error_code": "MISSING_API_KEY"
}
```

**Extraction Failed**:
```json
{
  "detail": "Failed to extract metadata from PDF",
  "error_code": "EXTRACTION_ERROR",
  "filename": "problematic_file.pdf"
}
```

---

## Rate Limiting

### Current Implementation

No rate limiting in development version.

### Production Recommendations

Implement rate limiting to prevent abuse:

```python
from fastapi import Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.post("/api/discover-syllabi")
@limiter.limit("10/hour")  # 10 requests per hour per IP
async def discover_syllabi(request: Request, input_data: URLInput):
    # endpoint logic
```

**Recommended Limits**:
- `/api/discover-syllabi`: 10 requests/hour
- `/api/extract-metadata`: 20 requests/hour
- `/api/job-status/{job_id}`: 60 requests/minute
- `/api/results/{job_id}`: 30 requests/hour

---

## Usage Examples

### Complete Workflow with cURL

**1. Start Discovery Job**:
```bash
curl -X POST http://localhost:8000/api/discover-syllabi \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://arts.ufl.edu/syllabi/",
    "job_name": "Test Job",
    "department": "arts"
  }'
```

**2. Check Job Status**:
```bash
curl http://localhost:8000/api/job-status/abc123def456
```

**3. Start Metadata Extraction**:
```bash
curl -X POST http://localhost:8000/api/extract-metadata \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "abc123def456",
    "selected_fields": ["class_name", "instructor", "reading_materials"]
  }'
```

**4. Check Extraction Progress**:
```bash
curl http://localhost:8000/api/extraction-progress/abc123def456
```

**5. Get Results**:
```bash
curl http://localhost:8000/api/results/abc123def456
```

**6. Download Results as CSV**:
```bash
curl -O http://localhost:8000/api/download-results/abc123def456?format=csv
```

### JavaScript/TypeScript Example

```typescript
const API_URL = 'http://localhost:8000'

// Start a job
async function startAnalysis() {
  const response = await fetch(`${API_URL}/api/discover-syllabi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://arts.ufl.edu/syllabi/',
      job_name: 'My Analysis',
      department: 'arts'
    })
  })
  
  const data = await response.json()
  return data.job_id
}

// Poll job status
async function pollJobStatus(jobId: string) {
  const response = await fetch(`${API_URL}/api/job-status/${jobId}`)
  const status = await response.json()
  
  if (status.status === 'completed') {
    console.log('Job completed!')
    return status
  } else if (status.status === 'error') {
    throw new Error('Job failed: ' + status.message)
  } else {
    // Poll again after 1 second
    await new Promise(resolve => setTimeout(resolve, 1000))
    return pollJobStatus(jobId)
  }
}

// Extract metadata
async function extractMetadata(jobId: string) {
  await fetch(`${API_URL}/api/extract-metadata`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      job_id: jobId,
      selected_fields: ['class_name', 'instructor', 'reading_materials']
    })
  })
}

// Get results
async function getResults(jobId: string) {
  const response = await fetch(`${API_URL}/api/results/${jobId}`)
  return await response.json()
}

// Complete workflow
async function runAnalysis() {
  const jobId = await startAnalysis()
  await pollJobStatus(jobId)
  await extractMetadata(jobId)
  await pollJobStatus(jobId)
  const results = await getResults(jobId)
  console.log(results)
}
```

### Python Example

```python
import requests
import time

API_URL = 'http://localhost:8000'

def start_analysis():
    response = requests.post(f'{API_URL}/api/discover-syllabi', json={
        'url': 'https://arts.ufl.edu/syllabi/',
        'job_name': 'Python Test',
        'department': 'arts'
    })
    return response.json()['job_id']

def poll_job_status(job_id):
    while True:
        response = requests.get(f'{API_URL}/api/job-status/{job_id}')
        status = response.json()
        
        if status['status'] == 'completed':
            return status
        elif status['status'] in ['error', 'failed']:
            raise Exception(f"Job failed: {status['message']}")
        
        time.sleep(1)

def extract_metadata(job_id):
    requests.post(f'{API_URL}/api/extract-metadata', json={
        'job_id': job_id,
        'selected_fields': ['class_name', 'instructor', 'reading_materials']
    })

def get_results(job_id):
    response = requests.get(f'{API_URL}/api/results/{job_id}')
    return response.json()

# Run workflow
job_id = start_analysis()
poll_job_status(job_id)
extract_metadata(job_id)
poll_job_status(job_id)
results = get_results(job_id)
print(results)
```

---

## WebSocket Support (Future Enhancement)

For real-time updates without polling, WebSocket support can be added:

```python
from fastapi import WebSocket

@app.websocket("/ws/job/{job_id}")
async def websocket_endpoint(websocket: WebSocket, job_id: str):
    await websocket.accept()
    while True:
        status = get_job_status(job_id)
        await websocket.send_json(status)
        await asyncio.sleep(1)
        if status['status'] in ['completed', 'error', 'failed']:
            break
    await websocket.close()
```

---

## API Versioning

Current version: **v1** (implicit)

Future versions will use URL prefixing:
- `/api/v1/discover-syllabi`
- `/api/v2/discover-syllabi`

---

## Support

- **Interactive Docs**: http://localhost:8000/docs
- **OpenAPI Spec**: http://localhost:8000/openapi.json
- **Troubleshooting**: See `docs/TROUBLESHOOTING.md`

---

*API documentation generated for Syllabus Analyzer v1.0*
