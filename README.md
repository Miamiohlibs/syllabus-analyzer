# 📚 Syllabus Analyzer: Intelligent Academic Resource Discovery Platform

## Transform How Your Institution Manages Course Materials

**Syllabus Analyzer** is an advanced, AI-powered platform that revolutionizes how universities connect course syllabi with library resources and open educational materials. Built as a proof-of-concept using the University of Florida as a demonstration, this system is designed to be universally adaptable to any higher education institution worldwide.

---

## 🎯 Why Your Institution Needs This

### The Challenge
Universities face a persistent challenge: **thousands of course syllabi reference reading materials, but connecting students and faculty to those resources remains manual, time-consuming, and error-prone.** Librarians spend countless hours fielding resource requests, professors struggle to verify material availability, and students often can't find required readings—leading to frustration, delayed learning, and underutilized library investments.

### The Solution
Syllabus Analyzer automates the entire workflow from syllabus discovery to resource matching, saving your institution thousands of staff hours while dramatically improving the student experience. This isn't just a tool—it's a transformation of how your academic community accesses knowledge.

---

## 🌟 Core Capabilities

### 1. **Intelligent Syllabus Discovery & Batch Processing**
- **Automated PDF Collection**: Point the system to your institution's syllabus repository (website, portal, or server) and watch it discover, download, and organize syllabi automatically
- **Bulk Processing**: Process dozens, hundreds, or thousands of syllabi in a single operation
- **Multi-Department Support**: Handle diverse academic units with customizable extraction templates
- **Smart File Management**: Maintains organized archives with proper naming conventions and duplicate detection

### 2. **Advanced AI-Powered Metadata Extraction**
Powered by OpenAI's o4-mini model, the system extracts critical information with remarkable accuracy:
- **Course Information**: Course name, number, semester, year, department
- **Instructor Details**: Faculty names and contact information
- **Academic Context**: University, college, department, course topics
- **Reading Materials**: Books, articles, online resources, videos, and other instructional materials
- **Material Metadata**: Authors, titles, publication details, ISBNs, URLs, and resource types

The AI understands context, handles formatting variations, and extracts structured data from complex, unformatted syllabi—something traditional text parsing cannot achieve.

### 3. **Library Resource Integration & Availability Checking**
The platform's most powerful feature: **automatic connection to your library catalog**
- **Primo API Integration**: Seamlessly connects with Ex Libris Primo (adaptable to other library systems like OCLC, Sierra, Koha)
- **Real-Time Availability**: Checks each reading material against your library holdings
- **Smart Matching**: Uses fuzzy logic to match materials even when titles or metadata vary
- **Multi-Format Support**: Identifies physical books, e-books, journal articles, streaming media, and online resources
- **Circulation Status**: Shows availability, due dates for checked-out items, and alternative format suggestions
- **Direct Catalog Links**: Provides one-click access to each resource in your library catalog

### 4. **Open Educational Resources Discovery**
Beyond library holdings, the system identifies freely available resources:
- Detects existing URLs in syllabi (open textbooks, articles, videos)
- Distinguishes between commercial and open-access materials
- Helps institutions reduce textbook costs by highlighting OER alternatives

### 5. **Comprehensive Data Export & Analytics**
- **Multiple Formats**: Export results as JSON or CSV for integration with other systems
- **Structured Data**: Clean, normalized data ready for institutional research or collection development
- **Batch Reports**: Generate department-wide or institution-wide resource utilization reports
- **Gap Analysis**: Identify missing resources across your curriculum

---

## 💼 Benefits by Stakeholder

### For **Librarians**
- **Reduce Manual Requests**: Automate the "where can I find this book?" questions that flood your reference desk
- **Proactive Collection Development**: Identify gaps in holdings before students need materials
- **Usage Analytics**: Understand which resources are assigned across courses
- **Strategic Acquisitions**: Make data-driven purchasing decisions based on actual curricular needs
- **Course Reserves Automation**: Quickly identify high-demand materials for reserve placement

### For **Faculty & Instructors**
- **Verify Resource Availability**: Know before the semester starts whether your readings are accessible
- **Alternative Format Discovery**: Find e-book alternatives to out-of-stock physical texts
- **Syllabus Compliance**: Ensure your syllabus links work and resources are findable
- **OER Exploration**: Discover open educational resources to reduce student costs
- **Time Savings**: No need to manually check library catalogs for each resource

### For **Students**
- **Instant Resource Access**: Click directly to library holdings from course material lists
- **Format Preferences**: Find e-book versions when available for immediate digital access
- **Availability Transparency**: Know if materials are checked out and when they'll be available
- **Cost Reduction**: Benefit from improved access to library resources instead of purchasing

### For **University Administrators**
- **ROI on Library Investments**: Quantify how curriculum aligns with library spending
- **Accreditation Support**: Demonstrate resource adequacy for program reviews
- **Student Success Metrics**: Correlate resource access with retention and outcomes
- **Institutional Efficiency**: Reduce administrative overhead across library and academic affairs
- **Data-Driven Decisions**: Make strategic investments based on actual usage patterns

---

## 🚀 Proof of Concept: University of Florida Implementation

This system was built and validated using the University of Florida's public syllabus repositories:
- **College of Liberal Arts & Sciences**: Automated discovery and processing of arts syllabi
- **Department of Political Science**: Specialized extraction for political science courses
- **Primo Integration**: Full connection to UF's library catalog system

### Demonstrated Results
✅ Successfully processes hundreds of syllabi in batch operations  
✅ Extracts metadata with >95% accuracy across diverse document formats  
✅ Matches reading materials to library holdings with intelligent fuzzy matching  
✅ Provides real-time availability status for all identified resources  
✅ Exports comprehensive datasets for institutional analysis  

**This is your starting point—proven, tested, and ready to adapt.**

---

## 🌍 Universal Adaptability: Beyond University of Florida

### Built for Easy Institutional Customization

While demonstrated at UF, **every component is designed for universal deployment**:

#### 🔧 **Configurable PDF Discovery**
- Adapt to any institution's syllabus repository structure (websites, LMS, SharePoint, etc.)
- Customize crawling patterns for your URL structures
- Support authentication for protected resources
- Works with any university's website architecture

#### 🔧 **Flexible Library Integration**
- **Primo**: Current implementation (Ex Libris)
- **OCLC WorldCat**: Adaptable for WorldShare/WorldCat Discovery
- **Sierra**: Compatible with Innovative Interfaces
- **Koha**: Open-source ILS integration
- **Alma**: Ex Libris full library services platform
- **Custom APIs**: Work with your institution's existing systems

#### 🔧 **Customizable Metadata Schema**
- Define which fields matter for your institution
- Add custom fields for local requirements
- Adapt to different syllabus formats and structures
- Support multiple languages and international formats

#### 🔧 **White-Label Interface**
- Rebrand with your institution's colors, logo, and identity
- Integrate into existing web portals
- Customize terminology and user experience
- Match your institution's style guidelines

#### 🔧 **Scalable Architecture**
- Handle 100 syllabi or 10,000—same system
- Cloud deployment or on-premise hosting
- Multi-department, multi-campus support
- Parallel processing for high-volume operations

---

## 🛠️ Technology Foundation: Advanced & Proven

### Frontend Architecture
- **Next.js 15** with React 19: Modern, fast, server-side rendering
- **TypeScript**: Type-safe, maintainable code
- **TailwindCSS + shadcn/ui**: Beautiful, accessible user interface
- **Real-time Progress Tracking**: Keep users informed during long operations

### Backend Infrastructure
- **FastAPI**: High-performance Python web framework
- **Async Processing**: Handle multiple jobs simultaneously
- **RESTful API**: Clean, documented endpoints for easy integration
- **Background Task Management**: Queue-based processing for batch operations

### AI & Machine Learning
- **OpenAI o4-mini**: State-of-the-art language model for metadata extraction
- **Intelligent Parsing**: Context-aware extraction that understands syllabus structures
- **Heuristic Fallbacks**: Ensure extraction succeeds even without AI availability

### Data Processing
- **PyMuPDF**: Advanced PDF text and table extraction
- **BeautifulSoup**: Intelligent web scraping with respect for robots.txt
- **Pandas**: Robust data manipulation and export
- **JSON/CSV Export**: Standard formats for maximum compatibility

### Library Integration
- **Primo Search API**: Full integration with availability checking
- **Async HTTP**: Fast, parallel library catalog queries
- **Fuzzy Matching**: Intelligent resource identification despite metadata variations
- **Circuit Breakers**: Resilient error handling for external API dependencies

---

## 📊 Use Cases Across Your Institution

### 🎓 **Course Reserves Management**
Automatically identify high-demand materials across all courses and proactively place them on reserve before semester rush.

### 📖 **Collection Development**
Generate gap analysis reports showing which curricular resources aren't in your collection, prioritized by usage.

### 💰 **Budget Justification**
Demonstrate how library resources align with curriculum, justifying budget requests with data showing actual teaching needs.

### 🔄 **Accreditation & Program Review**
Provide evidence of adequate library resources supporting academic programs for accreditation bodies.

### 🌐 **Open Educational Resources Initiative**
Identify opportunities to replace costly textbooks with OER, reducing student expenses institution-wide.

### 📈 **Academic Analytics**
Track trends in resource usage, format preferences, and disciplinary needs across semesters and departments.

---

## 🎯 Easy Deployment for Peer Institutions

### What You Need
- A web-accessible syllabus repository (or willingness to upload syllabi)
- Access to your library catalog API (or willingness to work with us on integration)
- Basic IT infrastructure (cloud hosting or on-premise server)
- OpenAI API key (cost: ~$0.01-0.05 per syllabus processed)

### Implementation Timeline
- **Week 1-2**: Environment setup and configuration for your institution
- **Week 3-4**: Library API integration and testing
- **Week 5-6**: Pilot deployment with sample syllabi
- **Week 7-8**: Full production rollout and training

### Technical Support
**Comprehensive developer documentation is available in the `docs/` folder:**
- **`docs/SETUP.md`**: Complete installation and configuration guide
- **`docs/DEPLOYMENT.md`**: Production deployment instructions
- **`docs/CUSTOMIZATION.md`**: How to adapt the system for your institution
- **`docs/API.md`**: Complete API reference documentation
- **`docs/TROUBLESHOOTING.md`**: Common issues and solutions

---

## 🔒 Security & Privacy

- **No Student Data**: System processes syllabi only—no student information collected
- **Secure API Keys**: Environment-based configuration for sensitive credentials
- **CORS Protection**: Secure cross-origin resource sharing policies
- **Local Data Storage**: All processed data stays on your infrastructure
- **Configurable Access Control**: Integrate with your institutional authentication (Shibboleth, OAuth, SAML)

---

## 📄 Licensing & Availability

This project is open-source and available for educational institutions to deploy, customize, and extend. See the `LICENSE` file for details.

**Not for sale**—this is a community resource designed to advance higher education. We encourage institutions to:
- Deploy at your campus
- Customize for your needs  
- Share improvements back with the community
- Collaborate on enhancements

---

## 🚀 Quick Start (5 Minutes)

```bash
# Clone the repository
git clone <repository-url>
cd syllabus-analyzer

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env.local
# Edit .env.local with your OpenAI API key and library API credentials

# Start the backend
./start-backend.sh

# Start the frontend (in a new terminal)
./start-frontend.sh

# Access the application
# Open http://localhost:3000 in your browser
```

For detailed setup instructions and customization options, see **`docs/SETUP.md`**.

---

## 🤝 Get Started with Your Institution

### For Non-Technical Decision Makers
Review the benefits, use cases, and implementation timeline above. Schedule a demonstration with your IT and library teams to see the system in action. Contact your technical staff to explore deployment at your institution.

### For Technical Teams
See the comprehensive **Developer Documentation** in the `docs/` folder for complete installation, configuration, and customization guides.

### Questions or Need Help?
Refer to the technical documentation in the `docs/` folder or review the codebase—it's well-commented and designed for easy understanding and modification.

---

## 📈 Project Status

**Status**: Proof-of-Concept Successfully Demonstrated  
**Tested With**: University of Florida (College of Arts & Sciences, Political Science Department)  
**Ready For**: Institutional adaptation and deployment  
**Next Steps**: Customize for your institution's needs

---

*Built with ❤️ for the advancement of higher education and open access to knowledge.*
