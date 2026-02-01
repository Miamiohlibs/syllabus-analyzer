#!/usr/bin/env python3
"""
 Political Science PDF Downloader
 
 Specialized PDF downloader for University of Florida Political Science syllabi with:
 - Downloads first 5 PDFs from specific Political Science Fall 2025 page
 - Concurrent downloads with rate limiting
 - Filename sanitization and preservation
 - Progress tracking and error handling
 
 Used by the Syllabus Analyzer backend for automated Political Science syllabus collection.
 """

import os
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import time
from pathlib import Path
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

class UFLPoliticalScienceDownloader:
    """
    Downloader for University of Florida Political Science syllabi PDFs.
    
    Features:
    - Downloads first 5 PDFs from the Fall 2025 Political Science page
    - Concurrent downloads with configurable thread pool
    - Progress tracking and error handling
    - Filename sanitization for cross-platform compatibility
    """
    
    def __init__(self, target_url="https://polisci.ufl.edu/dept-resources/syllabi/fall-2025/", 
                 download_folder="political_science", max_downloads=5):
        """
        Initialize the downloader.
        
        Args:
            target_url: Specific URL for Political Science Fall 2025 syllabi
            download_folder: Local folder for downloaded PDFs
            max_downloads: Maximum number of PDFs to download (default 5)
        """
        self.target_url = target_url
        self.download_folder = Path(download_folder)
        self.max_downloads = max_downloads
        self.downloaded_count = 0
        self.failed_count = 0
        self.lock = threading.Lock()
        self.downloaded_files = set()  # Track downloaded filenames to avoid duplicates
        
        # Create download folder if it doesn't exist
        self.download_folder.mkdir(exist_ok=True)
        print(f"Download folder: {self.download_folder.absolute()}")
        
    def create_session(self):
        """Create a new session with proper headers."""
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        return session
        
    def create_download_folder(self):
        """Create the download folder if it doesn't exist."""
        self.download_folder.mkdir(exist_ok=True)
        print(f"Created/verified download folder: {self.download_folder.absolute()}")
    
    def get_pdf_links_from_page(self, url):
        """Extract PDF links from the Political Science Fall 2025 page."""
        try:
            print(f"Scanning Political Science page: {url}")
            session = self.create_session()
            response = session.get(url)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
            
            pdf_links = []
            
            # Strategy 1: Look for direct PDF links
            for link in soup.find_all('a', href=True):
                href = link['href']
                if href.lower().endswith('.pdf'):
                    full_url = urljoin(url, href)
                    title = link.get_text(strip=True) or 'Untitled'
                    pdf_links.append({
                        'url': full_url,
                        'title': title
                    })
            
            # Strategy 2: Look for links in tables or specific containers
            # Many syllabi pages have tables with course info and PDF links
            tables = soup.find_all('table')
            for table in tables:
                for link in table.find_all('a', href=True):
                    href = link['href']
                    if href.lower().endswith('.pdf'):
                        full_url = urljoin(url, href)
                        title = link.get_text(strip=True) or 'Untitled'
                        
                        # Try to get course context from table row
                        row = link.find_parent('tr')
                        if row:
                            row_text = ' '.join([td.get_text(strip=True) for td in row.find_all('td')])
                            if len(row_text) > len(title):
                                title = row_text[:100] + '...' if len(row_text) > 100 else row_text
                        
                        pdf_links.append({
                            'url': full_url,
                            'title': title
                        })
            
            # Strategy 3: Look for embedded links or iframes
            # Some sites embed PDFs or use JavaScript links
            for iframe in soup.find_all('iframe'):
                src = iframe.get('src', '')
                if src.lower().endswith('.pdf'):
                    full_url = urljoin(url, src)
                    title = iframe.get('title') or 'Embedded PDF'
                    pdf_links.append({
                        'url': full_url,
                        'title': title
                    })
            
            # Remove duplicates based on URL
            unique_pdfs = {}
            for pdf in pdf_links:
                unique_pdfs[pdf['url']] = pdf
            pdf_links = list(unique_pdfs.values())
            
            # Limit to first N PDFs
            if len(pdf_links) > self.max_downloads:
                pdf_links = pdf_links[:self.max_downloads]
                print(f"  Limited to first {self.max_downloads} PDFs")
            
            print(f"  Found {len(pdf_links)} PDF links")
            for i, pdf in enumerate(pdf_links, 1):
                print(f"    {i}. {pdf['title'][:80]}...")
            
            return pdf_links
            
        except Exception as e:
            print(f"Error scanning page {url}: {e}")
            return []
    
    def sanitize_filename(self, filename):
        """Sanitize filename for safe file system storage."""
        # Remove or replace invalid characters
        filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
        # Remove extra whitespace and limit length
        filename = ' '.join(filename.split())[:200]
        return filename
    
    def download_pdf(self, pdf_info, session=None):
        """Download a single PDF file."""
        if session is None:
            session = self.create_session()
            
        url = pdf_info['url']
        title = pdf_info['title']
        
        try:
            # Generate filename from URL if title is not useful
            parsed_url = urlparse(url)
            url_filename = os.path.basename(parsed_url.path)
            
            if len(title) > 10 and not title.lower().startswith('http'):
                base_filename = self.sanitize_filename(title)
                if not base_filename.lower().endswith('.pdf'):
                    base_filename += '.pdf'
            else:
                base_filename = url_filename if url_filename.endswith('.pdf') else 'polisci_syllabus.pdf'
            
            # Add prefix to distinguish from Arts syllabi
            if not base_filename.lower().startswith('polisci_'):
                base_filename = 'polisci_' + base_filename
            
            # Ensure unique filename (thread-safe)
            with self.lock:
                counter = 1
                filename = base_filename
                while filename in self.downloaded_files:
                    name, ext = os.path.splitext(base_filename)
                    filename = f"{name}_{counter}{ext}"
                    counter += 1
                
                file_path = self.download_folder / filename
                
                # Skip if file already exists
                if file_path.exists():
                    print(f"  Skipping (already exists): {filename}")
                    self.downloaded_files.add(filename)
                    return True
                
                # Mark as being downloaded
                self.downloaded_files.add(filename)
            
            # Download the file
            print(f"  Downloading: {filename}")
            response = session.get(url, timeout=30)
            response.raise_for_status()
            
            # Check if it's actually a PDF
            content_type = response.headers.get('content-type', '').lower()
            if 'application/pdf' not in content_type and len(response.content) < 1024:
                print(f"  ✗ Not a valid PDF: {filename} (content-type: {content_type})")
                with self.lock:
                    self.downloaded_files.discard(filename)
                return False
            
            # Write file
            with open(file_path, 'wb') as f:
                f.write(response.content)
            
            file_size = len(response.content)
            print(f"  ✓ Downloaded: {filename} ({file_size} bytes)")
            return True
            
        except Exception as e:
            print(f"  ✗ Error downloading {url}: {e}")
            # Remove from downloaded set if failed
            with self.lock:
                if 'filename' in locals():
                    self.downloaded_files.discard(filename)
            return False
    
    def run(self):
        """Main method to run the complete download process."""
        print("UFL Political Science Syllabi PDF Downloader")
        print("=" * 50)
        print(f"Target: {self.target_url}")
        print(f"Max downloads: {self.max_downloads}")
        
        # Create download folder
        self.create_download_folder()
        
        # Get PDF links from the specific page
        pdf_links = self.get_pdf_links_from_page(self.target_url)
        
        if not pdf_links:
            print("No PDF files found on the Political Science page.")
            print("This might be because:")
            print("1. The page structure has changed")
            print("2. PDFs are loaded dynamically with JavaScript")
            print("3. The URL is incorrect or the page is temporarily unavailable")
            return
        
        print(f"\nTotal PDFs to download: {len(pdf_links)}")
        
        # Download all PDFs with limited concurrency
        print(f"\nStarting downloads to: {self.download_folder.absolute()}")
        print("-" * 50)
        
        successful_downloads = 0
        
        # Use ThreadPoolExecutor for concurrent downloads (but limited)
        max_workers = 3  # Conservative to be respectful to server
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all download tasks
            future_to_pdf = {}
            for i, pdf_info in enumerate(pdf_links):
                future = executor.submit(self.download_pdf, pdf_info)
                future_to_pdf[future] = (i + 1, pdf_info)
            
            # Process completed downloads
            for future in as_completed(future_to_pdf):
                i, pdf_info = future_to_pdf[future]
                try:
                    success = future.result()
                    if success:
                        successful_downloads += 1
                    print(f"Progress: {i}/{len(pdf_links)} completed")
                except Exception as e:
                    print(f"  ✗ Unexpected error: {e}")
        
        print("\n" + "=" * 50)
        print(f"Download complete!")
        print(f"Successfully downloaded: {successful_downloads}/{len(pdf_links)} files")
        print(f"Files saved to: {self.download_folder.absolute()}")
        
        return successful_downloads


def main():
    """Main function to run the downloader."""
    downloader = UFLPoliticalScienceDownloader()
    downloader.run()


if __name__ == "__main__":
    main()
