# Customization Guide

This guide explains how to customize the Syllabus Analyzer for your institution, including adapting the PDF discovery, library integration, and user interface.

---

## Table of Contents

1. [Institution-Specific Configuration](#institution-specific-configuration)
2. [PDF Discovery Customization](#pdf-discovery-customization)
3. [Library System Integration](#library-system-integration)
4. [Metadata Schema Customization](#metadata-schema-customization)
5. [UI Customization](#ui-customization)
6. [Department-Specific Settings](#department-specific-settings)

---

## Institution-Specific Configuration

### Basic Branding

**Update Application Name and Metadata**

Edit `app/layout.tsx`:
```typescript
export const metadata: Metadata = {
  title: "Syllabus Analyzer - Your University Name",
  description: "Intelligent syllabus analysis and resource discovery for Your University",
}
```

**Update Favicon and Logo**

Replace files in `public/`:
- `favicon.ico`: Browser tab icon
- `logo.png`: Application logo (if you add one)

**Configure Institution Name**

Edit `app/page.tsx` to replace "University of Florida" references:
```typescript
// Around line 274-276
const preconfiguredUrl = department === "polisci"
  ? "https://your-dept.youruniversity.edu/syllabi/"
  : "https://your-college.youruniversity.edu/syllabi/"
```

---

## PDF Discovery Customization

### Creating Custom Downloaders

The system uses specialized downloaders for different institutions. Here's how to create one for your university:

**Step 1: Create Your Downloader Class**

Create `scripts/your_university_downloader.py`:

```python
#!/usr/bin/env python3
"""
Your University Syllabus Downloader
Customize this for your institution's syllabus repository structure
"""

import os
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from pathlib import Path
import re
from concurrent.futures import ThreadPoolExecutor
import threading

class YourUniversityDownloader:
    """
    Downloader for Your University syllabi.
    
    Customize the following methods based on your website structure:
    - get_semester_links(): How to find semester/term pages
    - get_pdf_links_from_page(): How to extract PDF URLs
    - sanitize_filename(): How to name downloaded files
    """
    
    def __init__(self, base_url, download_folder="downloads"):
        self.base_url = base_url
        self.download_folder = Path(download_folder)
        self.downloaded_count = 0
        self.failed_count = 0
        self.lock = threading.Lock()
        self.downloaded_files = set()
        
        self.download_folder.mkdir(exist_ok=True)
        
    def create_session(self):
        """Create HTTP session with headers"""
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Educational Resource Bot)'
        })
        return session
    
    def get_semester_links(self):
        """
        CUSTOMIZE THIS: Find links to semester/department pages
        
        Example patterns to look for:
        - Links containing year patterns (2024, 2025)
        - Links containing semester terms (spring, fall, summer)
        - Links to department pages
        """
        try:
            session = self.create_session()
            response = session.get(self.base_url)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
            
            semester_links = []
            
            # CUSTOMIZE: Adapt to your HTML structure
            # Example: Find all links in a specific div
            for link in soup.find_all('a', href=True):
                href = link['href']
                # CUSTOMIZE: Your URL pattern matching logic
                if '/syllabi/' in href or '/courses/' in href:
                    full_url = urljoin(self.base_url, href)
                    semester_links.append(full_url)
            
            return list(set(semester_links))
            
        except Exception as e:
            print(f"Error getting semester links: {e}")
            return []
    
    def get_pdf_links_from_page(self, url):
        """
        CUSTOMIZE THIS: Extract PDF links from a page
        
        Look for:
        - Direct PDF links (href ending in .pdf)
        - Links to PDF files in document repositories
        - Download buttons linking to PDFs
        """
        try:
            session = self.create_session()
            response = session.get(url)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
            
            pdf_links = []
            
            # CUSTOMIZE: Find PDF links based on your HTML structure
            # Option 1: Direct PDF links
            for link in soup.find_all('a', href=True):
                href = link['href']
                if href.lower().endswith('.pdf'):
                    full_url = urljoin(url, href)
                    pdf_links.append(full_url)
            
            # Option 2: Links with specific classes or patterns
            for link in soup.select('a.syllabus-download'):  # CUSTOMIZE class name
                href = link.get('href', '')
                if href:
                    full_url = urljoin(url, href)
                    pdf_links.append(full_url)
            
            return pdf_links
            
        except Exception as e:
            print(f"Error getting PDF links from {url}: {e}")
            return []
    
    def sanitize_filename(self, url, response=None):
        """
        CUSTOMIZE THIS: Create meaningful filenames from URLs
        
        Extract information like:
        - Course code (BIO101, MATH201)
        - Semester (Fall2024, Spring2025)
        - Department name
        """
        # Get filename from URL
        parsed_url = urlparse(url)
        filename = os.path.basename(parsed_url.path)
        
        # CUSTOMIZE: Extract metadata from URL or filename
        # Example: URL like /syllabi/fall-2024/bio-101-syllabus.pdf
        parts = parsed_url.path.split('/')
        
        # Try to extract semester and course info
        semester = ""
        course = ""
        
        for part in parts:
            if any(term in part.lower() for term in ['spring', 'fall', 'summer']):
                semester = part
            if re.search(r'[A-Z]{3,4}\s*\d{3,4}', part, re.IGNORECASE):
                course = part
        
        # Clean filename
        filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
        
        # Ensure .pdf extension
        if not filename.lower().endswith('.pdf'):
            filename += '.pdf'
        
        return filename
    
    def download_pdf(self, url):
        """Download a single PDF"""
        try:
            session = self.create_session()
            response = session.get(url, timeout=30)
            response.raise_for_status()
            
            filename = self.sanitize_filename(url, response)
            filepath = self.download_folder / filename
            
            # Avoid duplicates
            if filename in self.downloaded_files:
                return
            
            with open(filepath, 'wb') as f:
                f.write(response.content)
            
            with self.lock:
                self.downloaded_files.add(filename)
                self.downloaded_count += 1
                print(f"Downloaded: {filename}")
                
        except Exception as e:
            with self.lock:
                self.failed_count += 1
            print(f"Failed to download {url}: {e}")
    
    def run(self, max_pdfs=None, max_workers=5):
        """
        Main execution method
        
        Args:
            max_pdfs: Limit number of PDFs (None for unlimited)
            max_workers: Number of concurrent downloads
        """
        print(f"Starting download from {self.base_url}")
        
        # Get all semester pages
        semester_links = self.get_semester_links()
        print(f"Found {len(semester_links)} semester pages")
        
        # Collect all PDF links
        all_pdf_links = []
        for semester_url in semester_links:
            pdf_links = self.get_pdf_links_from_page(semester_url)
            all_pdf_links.extend(pdf_links)
        
        all_pdf_links = list(set(all_pdf_links))  # Remove duplicates
        print(f"Found {len(all_pdf_links)} total PDF links")
        
        # Limit if specified
        if max_pdfs:
            all_pdf_links = all_pdf_links[:max_pdfs]
        
        # Download concurrently
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            executor.map(self.download_pdf, all_pdf_links)
        
        print(f"\nDownload complete!")
        print(f"Successfully downloaded: {self.downloaded_count}")
        print(f"Failed downloads: {self.failed_count}")
        
        return self.downloaded_count

# Example usage
if __name__ == "__main__":
    downloader = YourUniversityDownloader(
        base_url="https://your-university.edu/syllabi/",
        download_folder="downloads/your_uni"
    )
    downloader.run(max_pdfs=10)  # Test with 10 PDFs first
```

**Step 2: Integrate with Backend**

Edit `backend/app.py` to import your downloader:

```python
# Add your downloader import
from your_university_downloader import YourUniversityDownloader

# In the create_job endpoint, add your department option
class URLInput(BaseModel):
    url: HttpUrl
    job_name: Optional[str] = None
    department: str = "arts"  # "arts", "polisci", or "your_dept"

# In the discover-syllabi endpoint function
if department == "your_dept":
    downloader = YourUniversityDownloader(
        base_url=str(input_data.url),
        download_folder=str(job_folder)
    )
else:
    # existing logic
```

**Step 3: Add Frontend Option**

Edit `app/page.tsx` to add your department:

```typescript
// Add department state option
const [department, setDepartment] = useState<string>("your_dept")

// Add button in the UI
<Button
  variant={department === "your_dept" ? "default" : "outline"}
  onClick={() => setDepartment("your_dept")}
>
  Your Department
</Button>
```

---

## Library System Integration

### Primo Integration (Already Implemented)

Current implementation supports Ex Libris Primo. Configuration in `backend/.env`:

```env
PRIMO_API_BASE_URL=https://your-institution.primo.exlibrisgroup.com/primaws/rest/pub/pnxs
PRIMO_API_KEY=your-api-key
PRIMO_VID=your-view-id
PRIMO_TAB=Everything
PRIMO_SCOPE=MyInst_and_CI
```

### Custom Library System Integration

To integrate with a different library system (OCLC, Sierra, Koha, etc.):

**Step 1: Create Library Client**

Create `backend/your_library_integration.py`:

```python
#!/usr/bin/env python3
"""
Custom Library System Integration
Adapt this to your institution's library catalog API
"""

import asyncio
import aiohttp
from typing import Dict, Any, List, Optional

class YourLibraryClient:
    """
    Client for your library system's API
    
    Common library systems:
    - OCLC WorldCat: https://www.oclc.org/developer/api/oclc-apis/worldcat-search-api.en.html
    - Sierra (Innovative): Custom REST API
    - Koha: https://wiki.koha-community.org/wiki/Koha_RESTful_API
    - Alma: https://developers.exlibrisgroup.com/alma/apis
    """
    
    def __init__(self, api_url: str, api_key: str, **kwargs):
        self.api_url = api_url
        self.api_key = api_key
        self.session = None
        # Add other configuration parameters
        self.institution_code = kwargs.get('institution_code', '')
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def search_by_title_author(self, title: str, author: str = "") -> Dict[str, Any]:
        """
        Search library catalog by title and author
        
        CUSTOMIZE THIS based on your API:
        - Endpoint URL structure
        - Query parameters
        - Authentication method
        - Response parsing
        """
        if not self.session:
            raise RuntimeError("Client must be used as async context manager")
        
        try:
            # CUSTOMIZE: Build query based on your API
            query_params = {
                'title': title,
                'author': author,
                'format': 'json',
                # Add your API-specific parameters
            }
            
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                # or 'X-API-Key': self.api_key
                # Customize based on your API authentication
            }
            
            # CUSTOMIZE: Your API endpoint
            url = f"{self.api_url}/search"
            
            async with self.session.get(url, params=query_params, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    return self._parse_search_results(data)
                else:
                    return {"error": f"API returned status {response.status}"}
                    
        except Exception as e:
            return {"error": str(e)}
    
    def _parse_search_results(self, api_response: Dict) -> Dict[str, Any]:
        """
        Parse your library system's response format
        
        CUSTOMIZE THIS to extract:
        - Title
        - Authors
        - ISBN
        - Availability status
        - Call number
        - Location
        - Format (book, ebook, article, etc.)
        - Link to catalog record
        """
        matches = []
        
        # CUSTOMIZE: Navigate your API's response structure
        # This is an example - adapt to your actual response format
        for item in api_response.get('results', []):
            match = {
                'title': item.get('title', 'Unknown'),
                'authors': item.get('authors', []),
                'isbn': item.get('isbn', ''),
                'availability': self._determine_availability(item),
                'format': item.get('format', 'Unknown'),
                'location': item.get('location', 'Unknown'),
                'callNumber': item.get('call_number', ''),
                'link': item.get('catalog_url', ''),
                'coverImage': item.get('cover_image_url'),
                'dueDate': item.get('due_date') if item.get('status') == 'checked_out' else None
            }
            matches.append(match)
        
        return {
            'found': len(matches) > 0,
            'matches': matches,
            'matchScore': self._calculate_match_score(matches)
        }
    
    def _determine_availability(self, item: Dict) -> str:
        """
        Determine if item is available, checked out, or unavailable
        
        CUSTOMIZE based on your library system's status values
        """
        status = item.get('status', '').lower()
        
        # CUSTOMIZE these status mappings
        if status in ['available', 'on_shelf', 'in_library']:
            return 'available'
        elif status in ['checked_out', 'on_loan', 'borrowed']:
            return 'checked_out'
        else:
            return 'unavailable'
    
    def _calculate_match_score(self, matches: List[Dict]) -> float:
        """Calculate confidence score for matches"""
        if not matches:
            return 0.0
        return min(1.0, len(matches) * 0.3)  # Simple scoring

async def check_metadata_availability(metadata: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main function to check library availability
    Replace the Primo implementation with your library system
    """
    # Initialize your library client
    async with YourLibraryClient(
        api_url=os.getenv('YOUR_LIBRARY_API_URL'),
        api_key=os.getenv('YOUR_LIBRARY_API_KEY'),
        institution_code=os.getenv('YOUR_INSTITUTION_CODE')
    ) as client:
        
        reading_materials = metadata.get('reading_materials', [])
        library_matches = []
        
        for material in reading_materials:
            if isinstance(material, dict):
                title = material.get('title', '')
                author = material.get('creator', '')
                
                # Skip equipment
                if material.get('requirement', '').lower() == 'equipment':
                    continue
                
                # Handle existing URLs
                existing_url = material.get('url', '')
                if existing_url and existing_url.lower() not in ['unknown', '', 'none']:
                    library_matches.append({
                        "originalQuery": title,
                        "matchScore": 1.0,
                        "matches": [{
                            "title": title,
                            "authors": [author] if author else [],
                            "availability": "available",
                            "format": "Online Resource",
                            "location": "Online",
                            "link": existing_url,
                            "callNumber": None,
                            "dueDate": None,
                            "coverImage": None
                        }]
                    })
                    continue
                
                # Search library catalog
                if title:
                    result = await client.search_by_title_author(title, author)
                    if result.get('found'):
                        library_matches.append({
                            "originalQuery": title,
                            "matchScore": result.get('matchScore', 0.5),
                            "matches": result.get('matches', [])
                        })
        
        return {
            "metadata": metadata,
            "library_matches": library_matches
        }
```

**Step 2: Update Backend Configuration**

Edit `backend/.env`:
```env
# Your Library System Configuration
YOUR_LIBRARY_API_URL=https://catalog.youruniversity.edu/api/v1
YOUR_LIBRARY_API_KEY=your-api-key
YOUR_INSTITUTION_CODE=YOURINST
```

**Step 3: Update Backend Import**

Edit `backend/app.py`:
```python
# Replace Primo import
# from primo_integration import check_metadata_availability
from your_library_integration import check_metadata_availability
```

---

## Metadata Schema Customization

### Adding Custom Fields

Edit `backend/app.py` to define available fields:

```python
@app.get("/api/metadata-fields")
async def get_metadata_fields():
    """Define which fields users can select for extraction"""
    fields = [
        {"id": "year", "label": "Year", "description": "Academic year"},
        {"id": "semester", "label": "Semester", "description": "Term (Fall, Spring, Summer)"},
        {"id": "class_name", "label": "Course Name", "description": "Full course title"},
        {"id": "class_number", "label": "Course Number", "description": "Course code (e.g., BIO101)"},
        {"id": "instructor", "label": "Instructor", "description": "Professor name"},
        {"id": "university", "label": "University", "description": "Institution name"},
        {"id": "department", "label": "Department", "description": "Academic department"},
        {"id": "main_topic", "label": "Main Topic", "description": "Course subject matter"},
        {"id": "reading_materials", "label": "Reading Materials", "description": "Required/recommended resources"},
        
        # ADD YOUR CUSTOM FIELDS HERE
        {"id": "prerequisites", "label": "Prerequisites", "description": "Required prior courses"},
        {"id": "learning_objectives", "label": "Learning Objectives", "description": "Course goals"},
        {"id": "grading_policy", "label": "Grading Policy", "description": "Assessment breakdown"},
        {"id": "office_hours", "label": "Office Hours", "description": "Professor availability"},
    ]
    return {"fields": fields}
```

### Updating Extraction Prompts

Edit `scripts/syllabus_extractor.py` to extract custom fields:

```python
def call_llm_for_metadata(pdf_text: str) -> Dict:
    """Extract metadata including custom fields"""
    
    system_prompt = (
        "You are a precise academic metadata extraction assistant. "
        "Extract structured information from university course syllabi. "
        "Include all available information including prerequisites, learning objectives, and grading policies."
    )
    
    user_prompt = f"""
Extract the following information from this syllabus:

1. Academic Information:
   - year (e.g., "2024")
   - semester (e.g., "Fall", "Spring")
   - class_name (full course title)
   - class_number (course code)
   - instructor (professor name)
   - department
   - university

2. Course Content:
   - main_topic (brief course description)
   - reading_materials (list of required/recommended books, articles, etc.)
   
3. Course Policies (CUSTOM FIELDS):
   - prerequisites (required prior courses)
   - learning_objectives (main course goals)
   - grading_policy (assessment breakdown with percentages)
   - office_hours (when and where)

Format reading_materials as a JSON array with objects containing:
- title
- creator (author)
- type (book/article/video/website)
- requirement (required/recommended/optional)
- url (if available)

Syllabus text:
{pdf_text}

Return ONLY valid JSON matching this schema.
"""
    
    # Rest of function...
```

---

## UI Customization

### Theming and Colors

Edit `app/globals.css` to change colors:

```css
@layer base {
  :root {
    /* CUSTOMIZE: Your institution's colors */
    --primary: 210 100% 50%;  /* Blue */
    --secondary: 220 14% 96%;  /* Light gray */
    --accent: 30 100% 50%;     /* Orange */
    
    /* Or use your university's brand colors */
    /* Example: University of Florida colors */
    /* --primary: 210 100% 35%;  Orange */
    /* --secondary: 210 100% 20%; Blue */
  }
}
```

### Custom Logo and Branding

Edit `app/page.tsx` to add your logo:

```typescript
<div className="flex items-center gap-3 mb-6">
  <img src="/your-university-logo.png" alt="University Logo" className="h-12" />
  <h1 className="text-4xl font-bold">Syllabus Analyzer</h1>
  <p className="text-sm text-muted-foreground">Your University Name</p>
</div>
```

### Custom UI Text

Search and replace institution-specific text throughout the frontend:
- "University of Florida" → "Your University"
- Department names
- Help text and instructions

---

## Department-Specific Settings

### Creating Department Profiles

Create configuration file `config/departments.json`:

```json
{
  "departments": [
    {
      "id": "biology",
      "name": "Department of Biology",
      "syllabusUrl": "https://biology.youruniversity.edu/syllabi/",
      "defaultFields": ["class_name", "class_number", "instructor", "reading_materials"],
      "customSettings": {
        "requireLabSection": true,
        "extractLabMaterials": true
      }
    },
    {
      "id": "english",
      "name": "Department of English",
      "syllabusUrl": "https://english.youruniversity.edu/courses/syllabi/",
      "defaultFields": ["class_name", "instructor", "reading_materials", "main_topic"],
      "customSettings": {
        "literatureEmphasis": true
      }
    }
  ]
}
```

Load in backend:

```python
import json

with open('config/departments.json') as f:
    DEPT_CONFIG = json.load(f)

def get_department_config(dept_id: str):
    for dept in DEPT_CONFIG['departments']:
        if dept['id'] == dept_id:
            return dept
    return None
```

---

## Testing Your Customizations

### 1. Test PDF Discovery
```bash
cd scripts
python3 your_university_downloader.py
# Should download a few test PDFs
```

### 2. Test Metadata Extraction
```bash
cd backend
python3 scripts/syllabus_extractor.py path/to/test.pdf
# Should output JSON with extracted metadata
```

### 3. Test Library Integration
```python
# Test script
import asyncio
from your_library_integration import check_metadata_availability

test_metadata = {
    "reading_materials": [
        {"title": "Introduction to Biology", "creator": "Campbell"}
    ]
}

result = asyncio.run(check_metadata_availability(test_metadata))
print(result)
```

### 4. Test Full Workflow
1. Start both frontend and backend
2. Run analysis with test URL
3. Verify all steps complete
4. Check extracted data matches your schema
5. Verify library matches work

---

## Advanced Customizations

### Adding Authentication

See separate guide for integrating:
- Institutional SSO (Shibboleth, CAS)
- OAuth 2.0
- API key authentication

### Database Integration

Replace file-based storage with database:
- PostgreSQL for production
- MongoDB for flexible schema
- See `docs/DATABASE_INTEGRATION.md` (if needed)

### Multilingual Support

Add internationalization (i18n):
- Use next-i18next for frontend
- Support syllabi in multiple languages
- Configure OpenAI for language-specific extraction

---

## Support

For additional customization help:
- Review the codebase - it's well-commented
- Check API documentation in `docs/API.md`
- See troubleshooting guide at `docs/TROUBLESHOOTING.md`

---

*Customize confidently - the system is designed to be adaptable!*
