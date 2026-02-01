"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { LibraryResourceCard } from "@/components/library-resource-card"
import { Star, BookMarked, FileText, BookOpen, Globe, Video, Wrench, Download, AlertCircle, CheckCircle, Loader2, Database, Book, Monitor, HardDrive, Brain, Upload, BarChart3, FileSpreadsheet, RefreshCw, X, ChevronUp, ChevronDown, ShieldCheck, Sparkles, Package } from "lucide-react"

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
    reading_materials?: any[]
  }
  library_matches?: LibraryMatch[]
}

interface JobStatus {
  job_id: string
  status: string
  progress: number
  message: string
  files_found?: number
  files_downloaded?: number
  files_processed?: number
  selected_fields?: string[]
  results_file?: string
  primo_results_file?: string
}

interface MetadataField {
  id: string
  label: string
  description: string
}

interface LibraryMatch {
  originalQuery: string
  matches: Array<{
    title: string
    authors: string[]
    isbn: string
    availability: "available" | "checked_out" | "unavailable"
    format: string
    location: string
    callNumber: string
    link: string
    coverImage?: string
    dueDate?: string
  }>
  matchScore: number
  note?: string
}

interface ErrorInfo {
  id: string
  timestamp: string
  message: string
  source: "frontend" | "backend"
  step?: string
  details?: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function SyllabusAnalyzer() {
  const [syllabusUrl, setSyllabusUrl] = useState<string>("")
  const [jobName, setJobName] = useState<string>("")
  const [department, setDepartment] = useState<string>("arts")
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState<"upload" | "download" | "metadata" | "extract" | "results">("upload")
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [availableFields, setAvailableFields] = useState<MetadataField[]>([])
  const [extractedResults, setExtractedResults] = useState<ExtractedMetadata[]>([])
  const [libraryMatches, setLibraryMatches] = useState<LibraryMatch[]>([])
  const [currentJob, setCurrentJob] = useState<JobStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [jobs, setJobs] = useState<JobStatus[]>([])
  const [libraryMatchingStatus, setLibraryMatchingStatus] = useState<{
    isProcessing: boolean
    progress: number
    message: string
    error: string | null
  }>({ isProcessing: false, progress: 0, message: "", error: null })
  const [showDownloadSpinner, setShowDownloadSpinner] = useState(false)
  const [extractionStatus, setExtractionStatus] = useState<{
    isProcessing: boolean
    progress: number
    message: string
    filesProcessed: number
    totalFiles: number
    error: string | null
  }>({ isProcessing: false, progress: 0, message: "", filesProcessed: 0, totalFiles: 0, error: null })
  const [errorHistory, setErrorHistory] = useState<ErrorInfo[]>([])
  const [showErrorDashboard, setShowErrorDashboard] = useState(false)

  // Load available metadata fields on component mount
  useEffect(() => {
    fetchAvailableFields()
    loadJobs()
  }, [])

  // Poll job status when processing - clean and simple polling with limits
  useEffect(() => {
    // Only poll when job is actively downloading or pending, NOT when completed
    if (currentJob && ["pending", "downloading"].includes(currentJob.status) && currentStep === "download") {
      const interval = setInterval(() => {
        pollJobStatus(currentJob.job_id)
      }, 800) // Poll every 800ms - smooth but not overwhelming
      return () => clearInterval(interval)
    }
  }, [currentJob, currentStep])

  // Poll for extraction progress when in extract step - with reasonable limits
  useEffect(() => {
    // Only poll when actively processing, stop when completed
    if (currentStep === "extract" && currentJob && currentJob.status === "processing") {
      let pollCount = 0
      const maxPolls = 1200 // Max 20 minutes (1200 seconds at 1s intervals)
      
      const interval = setInterval(() => {
        pollCount++
        if (pollCount >= maxPolls) {
          console.log("Extraction polling limit reached, stopping...")
          clearInterval(interval)
          return
        }
        checkExtractionProgress(currentJob.job_id)
      }, 1000) // Poll every 1 second for real-time extraction progress
      return () => clearInterval(interval)
    }
  }, [currentStep, currentJob])

  // Poll for library matching progress when in results step - with limits
  useEffect(() => {
    if (currentStep === "results" && currentJob && libraryMatches.length === 0 && selectedFields.includes("reading_materials")) {
      let pollCount = 0
      const maxPolls = 100 // Max 5 minutes (100 polls at 3s intervals)
      
      const interval = setInterval(() => {
        pollCount++
        if (pollCount >= maxPolls) {
          console.log("Library matching polling limit reached, stopping...")
          clearInterval(interval)
          setLibraryMatchingStatus({
            isProcessing: false,
            progress: 0,
            message: "",
            error: "Library matching took too long. Results may be incomplete."
          })
          return
        }
        checkLibraryMatchingProgress(currentJob.job_id)
      }, 3000) // Poll every 3 seconds for library matching
      return () => clearInterval(interval)
    }
  }, [currentStep, currentJob, libraryMatches.length, selectedFields])

  // Auto-skip to results if job is already completed when entering metadata step
  useEffect(() => {
    if (currentStep === "metadata" && currentJob && currentJob.status === "completed" && currentJob.results_file) {
      console.log("Detected completed job on metadata step, auto-loading results")
      // Restore selected fields from the job if available
      if (currentJob.selected_fields && currentJob.selected_fields.length > 0) {
        setSelectedFields(currentJob.selected_fields)
      }
      loadResults(currentJob.job_id).then(() => {
        setCurrentStep("results")
      })
    }
  }, [currentStep, currentJob?.status, currentJob?.results_file])

  const fetchAvailableFields = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/metadata-fields`)
      const data = await response.json()
      setAvailableFields(data.fields)
    } catch (err) {
      console.error("Failed to fetch metadata fields:", err)
    }
  }

  const loadJobs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/jobs`)
      const data = await response.json()
      setJobs(data.jobs)
      
      // If we're on download step and don't have a current job, try to load the most recent completed job
      if (currentStep === "download" && !currentJob && data.jobs.length > 0) {
        const mostRecentJob = data.jobs[data.jobs.length - 1]
        if (mostRecentJob && mostRecentJob.status === "completed") {
          setCurrentJob(mostRecentJob)
          console.log("Loaded most recent completed job:", mostRecentJob.job_id)
        }
      }
    } catch (err) {
      console.error("Failed to load jobs:", err)
    }
  }

  const pollJobStatus = async (jobId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/job-status/${jobId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch job status: ${response.status}`)
      }
      
      const jobStatus = await response.json()
      setCurrentJob(jobStatus)
      
      if (jobStatus.status === "completed" && currentStep === "download") {
        setIsProcessing(false)
        // Hide spinner but wait for user to click "Continue to Metadata Selection" button
        setShowDownloadSpinner(false)
      } else if (jobStatus.status === "completed" && currentStep === "extract") {
        setExtractionStatus({
          isProcessing: false,
          progress: 100,
          message: "Extraction completed successfully!",
          filesProcessed: jobStatus.files_processed || 0,
          totalFiles: jobStatus.files_processed || 0,
          error: null
        })
        await loadResults(jobId)
        setCurrentStep("results")
        setIsProcessing(false)
      } else if (jobStatus.status === "completed" && currentStep === "results") {
        // Reload results to get updated library matches after Primo check
        await loadResults(jobId)
        // Update library matching status if it was processing
        if (libraryMatchingStatus.isProcessing) {
          setLibraryMatchingStatus({
            isProcessing: false,
            progress: 100,
            message: "Library resource matching completed!",
            error: null
          })
        }
      } else if (jobStatus.status === "error" || jobStatus.status === "failed") {
        const errorMessage = jobStatus.message || "Job failed with unknown error"
        setError(errorMessage)
        addError(errorMessage, "backend", `Job ID: ${jobStatus.job_id}`)
        setIsProcessing(false)
      }
    } catch (err) {
      console.error("Failed to poll job status:", err)
      const errorMessage = "Failed to check job status. Please refresh and try again."
      setError(errorMessage)
      addError(errorMessage, "frontend", err instanceof Error ? err.message : String(err))
      setIsProcessing(false)
    }
  }

  const startAnalysis = async () => {
    try {
      setIsProcessing(true)
      setError(null)
      setShowDownloadSpinner(true)
      setCurrentStep("download") // Set step to download so polling can detect completion

      const preconfiguredUrl = department === "polisci"
        ? "https://polisci.ufl.edu/dept-resources/syllabi/fall-2025/"
        : "https://arts.ufl.edu/syllabi/"

      const requestBody = {
        url: preconfiguredUrl,
        job_name: jobName || undefined,
        department: department
      }

      const response = await fetch(`${API_BASE_URL}/api/discover-syllabi`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (response.ok) {
        // Set initial job state to start polling immediately
        setCurrentJob({
          job_id: data.job_id,
          status: "pending",
          progress: 0,
          message: "Starting download process...",
          files_found: undefined,
          files_downloaded: undefined
        })

        // Start immediate polling - the useEffect will handle the rest
        pollJobStatus(data.job_id)
      } else {
        throw new Error(data.detail || "Failed to start processing")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to start processing"
      setError(errorMessage)
      addError(errorMessage, "frontend", `Department: ${department}`)
      setIsProcessing(false)
      setShowDownloadSpinner(false)  // Also hide spinner on error
    }
  }

  const toggleFieldSelection = (fieldId: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    )
  }

  const selectAllFields = () => {
    setSelectedFields(availableFields.map(field => field.id))
  }

  const deselectAllFields = () => {
    setSelectedFields([])
  }

  const startExtraction = async (isRetry = false) => {
    console.log("Starting extraction with:", { currentJob, selectedFields })
    
    // IMMEDIATE USER FEEDBACK: Set extraction status right away
    // This ensures the user sees that their click was registered
    if (!isRetry) {
      setExtractionStatus({
        isProcessing: true,
        progress: 0,
        message: "Initializing extraction...",
        filesProcessed: 0,
        totalFiles: currentJob?.files_downloaded || 0,
        error: null
      })
    }
    
    if (!currentJob || selectedFields.length === 0) {
      setError("Please select metadata fields to extract")
      setExtractionStatus({
        isProcessing: false,
        progress: 0,
        message: "",
        filesProcessed: 0,
        totalFiles: 0,
        error: "Please select metadata fields to extract"
      })
      return
    }

    // Check if job is already completed - skip directly to results
    if (currentJob.status === "completed" && currentJob.results_file) {
      console.log("Job already completed, loading results directly")
      await loadResults(currentJob.job_id)
      setCurrentStep("results")
      return
    }

    // Update status: Checking backend connection
    setExtractionStatus(prev => ({
      ...prev,
      message: "Checking backend connection..."
    }))

    // Quick connectivity check using API metadata fields endpoint
    try {
      const healthCheck = await fetch(`${API_BASE_URL}/api/metadata-fields`, { 
        method: "GET",
        signal: AbortSignal.timeout(5000) // 5 second timeout for health check
      })
      if (!healthCheck.ok) {
        throw new Error(`Backend not responding (${healthCheck.status})`)
      }
    } catch (healthErr) {
      const connectivityError = `Cannot connect to backend at ${API_BASE_URL}. Please make sure the backend server is running.`
      setError(connectivityError)
      addError(connectivityError, "frontend", healthErr instanceof Error ? healthErr.message : String(healthErr))
      setExtractionStatus({
        isProcessing: false,
        progress: 0,
        message: "",
        filesProcessed: 0,
        totalFiles: 0,
        error: connectivityError
      })
      return
    }

    // Check if Reading Materials is selected (required field)
    if (!selectedFields.includes("reading_materials")) {
      const requiredFieldError = "Reading Materials is required. Please select it to continue."
      setError(requiredFieldError)
      setExtractionStatus({
        isProcessing: false,
        progress: 0,
        message: "",
        filesProcessed: 0,
        totalFiles: 0,
        error: requiredFieldError
      })
      return
    }

    if (!currentJob.job_id) {
      const jobError = "No valid job found. Please restart the process."
      setError(jobError)
      setExtractionStatus({
        isProcessing: false,
        progress: 0,
        message: "",
        filesProcessed: 0,
        totalFiles: 0,
        error: jobError
      })
      return
    }

    // Clear any existing errors
    setError(null)
    
    // Update status: Ready to start extraction
    setExtractionStatus(prev => ({
      ...prev,
      message: "Starting metadata extraction..."
    }))

    try {
      console.log("Sending extraction request to:", `${API_BASE_URL}/api/extract-metadata`)
      
      // Add timeout to prevent hanging - increased to 20 minutes for large jobs
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
        console.log("Request timed out after 1200 seconds")
      }, 1200000) // 1200 second (20 minute) timeout
      
      const response = await fetch(`${API_BASE_URL}/api/extract-metadata`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          job_id: currentJob.job_id,
          selected_fields: selectedFields
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      console.log("Extraction response status:", response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error("Extraction error response:", errorText)
        let errorMessage = "Failed to start extraction"
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.detail || errorMessage
        } catch {
          errorMessage = `Server error (${response.status}): ${errorText}`
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log("Extraction started successfully:", result)
      
      // Immediately transition to extract step
      setCurrentStep("extract")
      
      // Initialize extraction status
      setExtractionStatus({
        isProcessing: true,
        progress: 0,
        message: "Starting metadata extraction...",
        filesProcessed: 0,
        totalFiles: currentJob?.files_downloaded || 0,
        error: null
      })
      
      // Update current job with processing status
      setCurrentJob(prev => prev ? { ...prev, status: "processing", progress: 0, message: "Starting extraction..." } : null)
      
    } catch (err) {
      console.error("Extraction failed:", err)
      
      if (err instanceof Error && err.name === 'AbortError') {
        const timeoutMessage = "Request timed out after 20 minutes. The extraction process may be taking longer than expected. You can try again or check if the backend is still processing."
        setError(timeoutMessage)
        addError(timeoutMessage, "frontend", "Extraction request timeout after 1200 seconds")
        setExtractionStatus({
          isProcessing: false,
          progress: 0,
          message: "",
          filesProcessed: 0,
          totalFiles: 0,
          error: timeoutMessage
        })
      } else {
        const errorMessage = err instanceof Error ? err.message : "Failed to start extraction"
        setError(errorMessage)
        addError(errorMessage, "frontend", `Job ID: ${currentJob.job_id}`)
        setExtractionStatus({
          isProcessing: false,
          progress: 0,
          message: "",
          filesProcessed: 0,
          totalFiles: 0,
          error: errorMessage
        })
      }
    }
  }

  const loadResults = async (jobId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/results/${jobId}`)
      const data = await response.json()
      setExtractedResults(data.results)
      
      // Process library matches from the results - keep them associated with syllabi
      const matches: LibraryMatch[] = []
      if (data.results) {
        data.results.forEach((result: any) => {
          if (result.library_matches && Array.isArray(result.library_matches)) {
            // Add filename context to each match for grouping
            result.library_matches.forEach((match: any) => {
              matches.push({
                ...match,
                syllabusFilename: result.filename // Add syllabus context
              })
            })
          }
        })
      }
      setLibraryMatches(matches)
      
      // Start Primo check if reading materials are selected and no library matches yet
      if (selectedFields.includes("reading_materials") && matches.length === 0) {
        setLibraryMatchingStatus({
          isProcessing: true,
          progress: 0,
          message: "Starting library resource matching...",
          error: null
        })
        await startPrimoCheck(jobId)
      }
    } catch (err) {
      console.error("Failed to load results:", err)
      const errorMessage = "Failed to load results. Please try again."
      setError(errorMessage)
      addError(errorMessage, "frontend", `Job ID: ${jobId}`)
    }
  }

  const startPrimoCheck = async (jobId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/check-primo/${jobId}`, {
        method: "POST"
      })
      
      if (!response.ok) {
        throw new Error(`Failed to start library matching: ${response.status}`)
      }
      
      // Results will be updated via polling
    } catch (err) {
      console.error("Failed to start Primo check:", err)
      const errorMessage = "Failed to start library resource matching. Please check your connection and try again."
      setLibraryMatchingStatus({
        isProcessing: false,
        progress: 0,
        message: "",
        error: errorMessage
      })
      addError(errorMessage, "frontend", `Job ID: ${jobId}`)
    }
  }

  const checkLibraryMatchingProgress = async (jobId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/job-status/${jobId}`)
      if (!response.ok) {
        throw new Error(`Failed to check status: ${response.status}`)
      }
      
      const jobStatus = await response.json()
      
      // Check if this is a library matching operation in progress
      if (jobStatus.status === "processing" && jobStatus.message && 
          (jobStatus.message.includes("Checking resources") || 
           jobStatus.message.includes("library resources") ||
           jobStatus.message.includes("Primo API"))) {
        setLibraryMatchingStatus({
          isProcessing: true,
          progress: jobStatus.progress || 0,
          message: jobStatus.message,
          error: null
        })
      } else if (jobStatus.status === "completed") {
        // Check if we now have library matches
        await loadResults(jobId)
      } else if (jobStatus.status === "error" || jobStatus.status === "failed") {
        const errorMessage = jobStatus.message || "Library resource matching failed"
        setLibraryMatchingStatus({
          isProcessing: false,
          progress: 0,
          message: "",
          error: errorMessage
        })
        addError(errorMessage, "backend", `Library matching failed for Job ID: ${jobId}`)
      }
    } catch (err) {
      console.error("Failed to check library matching progress:", err)
      setLibraryMatchingStatus(prev => ({
        ...prev,
        error: "Unable to check progress. Please refresh the page."
      }))
    }
  }

  const checkExtractionProgress = async (jobId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/job-status/${jobId}`)
      if (!response.ok) {
        throw new Error(`Failed to check status: ${response.status}`)
      }
      
      const jobStatus = await response.json()
      
      // Update current job status
      setCurrentJob(jobStatus)
      
      // Check if this is an extraction operation in progress
      if (jobStatus.status === "processing") {
        setExtractionStatus({
          isProcessing: true,
          progress: jobStatus.progress || 0,
          message: jobStatus.message || "Processing syllabi...",
          filesProcessed: jobStatus.files_processed || 0,
          totalFiles: currentJob?.files_downloaded || 0,
          error: null
        })
      } else if (jobStatus.status === "completed") {
        setExtractionStatus({
          isProcessing: false,
          progress: 100,
          message: "Metadata extraction completed!",
          filesProcessed: jobStatus.files_processed || 0,
          totalFiles: jobStatus.files_processed || 0,
          error: null
        })
        // Automatically transition to results after extraction completes
        await loadResults(jobId)
        setCurrentStep("results")
        setIsProcessing(false)
      } else if (jobStatus.status === "error" || jobStatus.status === "failed") {
        const errorMessage = jobStatus.message || "Metadata extraction failed"
        setExtractionStatus({
          isProcessing: false,
          progress: 0,
          message: "",
          filesProcessed: 0,
          totalFiles: 0,
          error: errorMessage
        })
        addError(errorMessage, "backend", `Extraction failed for Job ID: ${jobId}`)
        setIsProcessing(false)
      }
    } catch (err) {
      console.error("Failed to check extraction progress:", err)
      setExtractionStatus(prev => ({
        ...prev,
        error: "Unable to check extraction progress. Please refresh the page."
      }))
    }
  }

  const downloadResults = async () => {
    if (!currentJob) return
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/download-results/${currentJob.job_id}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `syllabus_analysis_${currentJob.job_id}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (err) {
      console.error("Failed to download results:", err)
      const errorMessage = "Failed to download results. Please try again."
      setError(errorMessage)
      addError(errorMessage, "frontend", `Job ID: ${currentJob.job_id}`)
    }
  }

  const downloadCSV = async () => {
    if (!currentJob) return
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/download-csv/${currentJob.job_id}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `syllabus_analysis_${currentJob.job_id}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        throw new Error(`Failed to download CSV: ${response.status}`)
      }
    } catch (err) {
      console.error("Failed to download CSV:", err)
      const errorMessage = "Failed to download CSV. Please try again."
      setError(errorMessage)
      addError(errorMessage, "frontend", `Job ID: ${currentJob.job_id}`)
    }
  }

  // Error tracking utility function
  const addError = (message: string, source: "frontend" | "backend", details?: string) => {
    const errorId = Date.now().toString()
    const newError: ErrorInfo = {
      id: errorId,
      timestamp: new Date().toLocaleString(),
      message,
      source,
      step: currentStep,
      details
    }
    setErrorHistory(prev => [newError, ...prev].slice(0, 10)) // Keep only last 10 errors
    
    // Auto-show dashboard if hidden and there's a new error
    if (!showErrorDashboard) {
      setShowErrorDashboard(true)
    }
  }

  const clearError = (errorId: string) => {
    setErrorHistory(prev => prev.filter(err => err.id !== errorId))
  }

  const clearAllErrors = () => {
    setErrorHistory([])
  }

  const resetAnalysis = () => {
    setCurrentStep("upload")
    setExtractedResults([])
    setLibraryMatches([])
    setSelectedFields([])
    setSyllabusUrl("")
    setJobName("")
    setCurrentJob(null)
    setError(null)
    setIsProcessing(false)
    setShowDownloadSpinner(false)
    setLibraryMatchingStatus({ isProcessing: false, progress: 0, message: "", error: null })
    setExtractionStatus({ isProcessing: false, progress: 0, message: "", filesProcessed: 0, totalFiles: 0, error: null })
    // Keep error history for reference, don't clear it on reset
  }

  const startNewAnalysis = () => {
    // More comprehensive reset for "Start New" button
    resetAnalysis()
    clearAllErrors() // Clear errors when starting completely fresh
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-accent rounded-lg">
                <Brain className="w-6 h-6 text-accent-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Syllabus Analyzer</h1>
                <p className="text-muted-foreground">AI-powered metadata extraction and library resource matching</p>
              </div>
            </div>
            
            {/* Start New Button - Show only when not on upload step */}
            {currentStep !== "upload" && (
              <Button
                variant="outline"
                size="sm"
                onClick={startNewAnalysis}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Start New
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {[
              { key: "upload", label: "Upload", icon: Upload },
              { key: "download", label: "Download", icon: FileText },
              { key: "metadata", label: "Metadata", icon: Brain },
              { key: "extract", label: "Extract", icon: Database },
              { key: "results", label: "Results", icon: CheckCircle },
            ].map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.key
              const isCompleted = ["upload", "download", "metadata", "extract", "results"].indexOf(currentStep) > index

              return (
                <div key={step.key} className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      isActive
                        ? "bg-accent border-accent text-accent-foreground"
                        : isCompleted
                          ? "bg-accent border-accent text-accent-foreground"
                          : "bg-muted border-border text-muted-foreground"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className={`text-sm mt-2 ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}
                  >
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="max-w-2xl mx-auto mb-6" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Upload Section */}
        {currentStep === "upload" && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-balance">Discover Syllabus PDFs</CardTitle>
              <CardDescription>
                Choose a department and start your syllabus analysis. Each department has a different analysis source.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="job-name">Job Name (Optional)</Label>
                <Input
                  id="job-name"
                  type="text"
                  placeholder="My Syllabus Analysis"
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <Label>Department Selection</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div 
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      department === "arts" 
                        ? "border-blue-500 bg-blue-50 shadow-md" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setDepartment("arts")}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <input
                        type="radio"
                        id="arts"
                        name="department"
                        value="arts"
                        checked={department === "arts"}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="text-blue-600"
                      />
                      <label htmlFor="arts" className="font-medium cursor-pointer">Arts & Design</label>
                    </div>
                    <p className="text-sm text-gray-600">
                      Analyzes syllabi from the University of Florida College of Arts & Design departments.
                    </p>
                  </div>
                  
                  <div 
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      department === "polisci" 
                        ? "border-green-500 bg-green-50 shadow-md" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setDepartment("polisci")}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <input
                        type="radio"
                        id="polisci"
                        name="department"
                        value="polisci"
                        checked={department === "polisci"}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="text-green-600"
                      />
                      <label htmlFor="polisci" className="font-medium cursor-pointer">Political Science</label>
                    </div>
                    <p className="text-sm text-gray-600">
                      Analyzes the first 5 syllabi from UFL Political Science Fall 2025 semester.
                    </p>
                  </div>
                </div>
              </div>
              
              {department === "arts" && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-4 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <span className="font-medium text-green-800">Arts & Design Configuration</span>
                  </div>
                  <p className="text-sm text-green-700">
                    <strong>Source:</strong> https://arts.ufl.edu/syllabi/
                  </p>
                  <p className="text-sm text-green-700">
                    <strong>Scope:</strong> First 5 syllabi
                  </p>
                </div>
              )}

              {department === "polisci" && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-4 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">Political Science Configuration</span>
                  </div>
                  <p className="text-sm text-green-700">
                    <strong>Source:</strong> https://polisci.ufl.edu/dept-resources/syllabi/fall-2025/
                  </p>
                  <p className="text-sm text-green-700">
                    <strong>Scope:</strong> First 5 syllabi from Fall 2025 semester
                  </p>
                </div>
              )}

              <Button
                onClick={startAnalysis}
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? "Starting..." : "Discover & Download PDFs"}
              </Button>

              {/* Manual navigation if stuck */}
              {isProcessing && (
                <div className="mt-4 p-4 bg-gray-50 border border-gray-300 rounded-lg">
                  <p className="text-sm text-gray-700 mb-3">
                    <strong>Stuck on "Starting..."?</strong> If your download completed but the UI isn't updating:
                  </p>
                  <div className="space-y-2">
                    <Button
                      onClick={() => {
                        setIsProcessing(false)
                        setCurrentStep("download")
                        loadJobs()
                      }}
                      variant="outline" 
                      size="sm"
                      className="w-full"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Go to Download Step & Refresh Status
                    </Button>
                    
                    <Button
                      onClick={() => {
                        setIsProcessing(false)
                        setCurrentStep("metadata")
                        loadJobs()
                      }}
                      variant="default" 
                      size="sm"
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      Skip Directly to Metadata Selection
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Download Progress Section */}
        {currentStep === "download" && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Discovering & Downloading Syllabi
                {currentJob?.status === "completed" && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
              </CardTitle>
              <CardDescription>
                {currentJob?.status === "completed" 
                  ? "Download completed successfully! Click the button below to continue."
                  : "Scanning for PDF files and downloading them..."
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Always show this debug info when on download step */}
              <div className="text-xs bg-red-100 p-2 rounded border">
                DEBUG: currentJob = {currentJob ? "EXISTS" : "NULL"} | 
                showDownloadSpinner = {showDownloadSpinner.toString()} | 
                isProcessing = {isProcessing.toString()}
              </div>

              {/* Show spinner even when currentJob is null if showDownloadSpinner is true */}
              {showDownloadSpinner && !currentJob && (
                <div className="flex justify-center items-center py-6 bg-white rounded-lg border-2 border-dashed border-gray-300">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-12 h-12 animate-spin text-gray-600" />
                    <span className="text-sm font-medium text-gray-600">
                      Initializing job...
                    </span>
                  </div>
                </div>
              )}
              
              {currentJob && (
                <>
                  {/* Show spinning wheel based on showDownloadSpinner state */}
                  {showDownloadSpinner && (
                    <div className="flex justify-center items-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-blue-300">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                        <span className="text-sm font-medium text-blue-600">
                          {currentJob?.status === "completed" ? "Finalizing..." : `Status: ${currentJob?.status || "starting"} | Processing...`}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Debug info - remove this after testing */}
                  {currentJob && (
                    <div className="text-xs bg-gray-100 p-2 rounded border border-gray-300">
                      DEBUG: Job Status = "{currentJob.status}" | Step = "{currentStep}" | Job ID = "{currentJob.job_id}"
                    </div>
                  )}

                  {/* Manual refresh button if stuck */}
                  {!currentJob && (
                    <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg">
                      <p className="text-sm text-gray-700 mb-2">No active job found. If you have completed downloads, try refreshing the job status:</p>
                      <div className="space-y-2">
                        <Button
                          onClick={loadJobs}
                          variant="outline" 
                          size="sm"
                          className="w-full"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Refresh Job Status
                        </Button>
                        
                        <Button
                          onClick={() => setCurrentStep("metadata")}
                          variant="default" 
                          size="sm"
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          Skip to Metadata Selection (Manual Override)
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className={`text-sm ${
                    currentJob.status === "completed" 
                      ? "text-green-700 font-medium" 
                      : "text-muted-foreground"
                  }`}>
                    {currentJob.message}
                  </div>

                  {currentJob.files_found !== undefined && (
                    <div className="grid grid-cols-2 gap-4 text-sm p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Found
                        </Badge>
                        <span className="font-medium">{currentJob.files_found} files</span>
                      </div>
                      {currentJob.files_downloaded !== undefined && (
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={currentJob.status === "completed" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            Downloaded
                          </Badge>
                          <span className="font-medium">{currentJob.files_downloaded} files</span>
                        </div>
                      )}
                    </div>
                  )}

                  {currentJob.status === "completed" && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex flex-col gap-4">
                      <div className="flex items-center gap-2 text-green-800 mb-3">
                        <CheckCircle className="w-4 h-4" />
                        <span className="font-medium">Download Complete!</span>
                      </div>
                      <p className="text-sm text-green-700 mb-4">
                        Successfully downloaded {currentJob.files_downloaded} PDF files. Ready to select metadata fields for extraction.
                      </p>
                      <Button 
                        onClick={() => setCurrentStep("metadata")}
                        className="w-full"
                        size="sm"
                      >
                        Continue to Metadata Selection
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Metadata Selection Section */}
        {currentStep === "metadata" && (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle>Select Metadata to Extract</CardTitle>
              <CardDescription>
                Choose which metadata fields you want our AI to extract from your syllabi.
                {currentJob && currentJob.files_downloaded && (
                  <span className="block mt-1 font-medium">Ready to process {currentJob.files_downloaded} PDF files</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Show alert if job is already completed */}
              {currentJob && currentJob.status === "completed" && currentJob.results_file && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800 mb-3">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Results Already Available!</span>
                  </div>
                  <p className="text-sm text-green-700 mb-4">
                    This job has already been processed with {currentJob.files_processed || currentJob.files_downloaded} syllabi analyzed.
                  </p>
                  <Button 
                    onClick={async () => {
                      if (currentJob.selected_fields) {
                        setSelectedFields(currentJob.selected_fields)
                      }
                      await loadResults(currentJob.job_id)
                      setCurrentStep("results")
                    }}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    View Results
                  </Button>
                </div>
              )}

              {/* Select All / Deselect All Controls */}
              <div className="flex justify-between items-center mb-6 p-4 bg-muted/30 rounded-lg border">
                <div className="text-sm font-medium">
                  {selectedFields.length} of {availableFields.length} fields selected
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllFields}
                    disabled={selectedFields.length === availableFields.length}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={deselectAllFields}
                    disabled={selectedFields.length === 0}
                  >
                    Deselect All
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {availableFields.map((field) => {
                  const isSelected = selectedFields.includes(field.id)
                  return (
                    <Card
                      key={field.id}
                      className={`cursor-pointer transition-colors border-2 ${
                        isSelected ? "bg-accent/10 border-accent" : "hover:bg-accent/5 hover:border-accent"
                      }`}
                      onClick={() => toggleFieldSelection(field.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="font-medium text-sm">{field.label}</h4>
                            <p className="text-xs text-muted-foreground">{field.description}</p>
                          </div>
                          <Badge variant={isSelected ? "default" : "secondary"} className="ml-2">
                            {isSelected ? "Selected" : "Select"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              <div className="mt-6 space-y-4">
                {selectedFields.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground">
                    Please select at least one metadata field to continue
                  </div>
                )}
                
                {selectedFields.length > 0 && !selectedFields.includes("reading_materials") && (
                  <div className="text-center text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                    ⚠️ Reading Materials is required for library resource matching
                  </div>
                )}
                
                <div className="flex justify-center">
                  <Button 
                    onClick={() => startExtraction()} 
                    size="lg" 
                    disabled={selectedFields.length === 0 || !selectedFields.includes("reading_materials") || extractionStatus.isProcessing}
                    className="min-w-[300px]"
                  >
                    {extractionStatus.isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Starting Extraction...
                      </>
                    ) : selectedFields.length > 0 && selectedFields.includes("reading_materials") ? (
                      `Extract Selected Metadata (${selectedFields.length} fields)`
                    ) : selectedFields.length > 0 ? (
                      "Reading Materials Required"
                    ) : (
                      "Select Metadata Fields"
                    )}
                  </Button>
                </div>
                
                {extractionStatus.isProcessing && (
                  <div className="text-center text-sm text-blue-600 bg-blue-50 p-3 rounded-lg border border-blue-200 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {extractionStatus.message}
                  </div>
                )}
                
                {!extractionStatus.isProcessing && selectedFields.length > 0 && selectedFields.includes("reading_materials") && (
                  <div className="text-center text-sm text-green-600">
                    ✓ Ready to extract {selectedFields.length} metadata field{selectedFields.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === "extract" && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Extracting Metadata
                {extractionStatus.isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
              </CardTitle>
              <CardDescription>
                {extractionStatus.error 
                  ? "Extraction encountered an error"
                  : extractionStatus.isProcessing 
                    ? "AI is analyzing your syllabi and extracting metadata..."
                    : "Metadata extraction completed successfully!"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {extractionStatus.error ? (
                <div className="text-center space-y-4">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                  <div>
                    <p className="text-red-600 font-medium mb-2">Extraction Error</p>
                    <p className="text-sm text-muted-foreground mb-4">{extractionStatus.error}</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        if (currentJob) {
                          setExtractionStatus({
                            isProcessing: true,
                            progress: 0,
                            message: "Retrying metadata extraction...",
                            filesProcessed: 0,
                            totalFiles: currentJob.files_downloaded || 0,
                            error: null
                          })
                          startExtraction(true)
                        }
                      }}
                    >
                      Retry Extraction
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Extraction Progress</span>
                      <span>{extractionStatus.progress}%</span>
                    </div>
                    <Progress value={extractionStatus.progress} className="w-full" />
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {extractionStatus.message || "Processing syllabi..."}
                  </div>

                  {extractionStatus.totalFiles > 0 && (
                    <div className="grid grid-cols-2 gap-4 text-sm p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Total
                        </Badge>
                        <span className="font-medium">{extractionStatus.totalFiles} files</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={extractionStatus.progress === 100 ? "default" : "secondary"}
                          className="text-xs"
                        >
                          Processed
                        </Badge>
                        <span className="font-medium">{extractionStatus.filesProcessed} files</span>
                      </div>
                    </div>
                  )}

                  {extractionStatus.progress === 100 && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-800 mb-2">
                        <CheckCircle className="w-4 h-4" />
                        <span className="font-medium">Extraction Complete!</span>
                      </div>
                      <p className="text-sm text-green-700">
                        Successfully processed {extractionStatus.filesProcessed} syllabi. Preparing results...
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {currentStep === "results" && (
          <div className="space-y-8">
            {/* Results Summary */}
            <Card className="max-w-4xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Analysis Complete
                </CardTitle>
                <CardDescription>
                  Successfully processed {extractedResults.length} syllabi and found{" "}
                  {libraryMatches.reduce((acc, match) => acc + match.matches.length, 0)} library resources
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-accent">{extractedResults.length}</div>
                    <div className="text-sm text-muted-foreground">Syllabi Processed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-accent">{selectedFields.length}</div>
                    <div className="text-sm text-muted-foreground">Metadata Fields</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-accent">
                      {libraryMatches.reduce((acc, match) => acc + match.matches.length, 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Resources Found</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-accent">
                      {libraryMatches.reduce(
                        (acc, match) => acc + match.matches.filter((m) => m.availability === "available").length,
                        0,
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">Available Now</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Global Icon and Color Guide */}
            <Card className="max-w-6xl mx-auto">
              <CardHeader>
                <CardTitle className="text-lg">Material Type Guide</CardTitle>
                <CardDescription>Icons and colors used throughout the results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {/* Requirement Status */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">Status</div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-red-600" />
                      <span className="text-sm">Required</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span className="text-sm">Suggested</span>
                    </div>
                  </div>
                  
                  {/* Material Types */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">Books</div>
                    <div className="flex items-center gap-2">
                      <BookMarked className="w-4 h-4 text-blue-700" />
                      <span className="text-sm">Book</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-purple-600" />
                      <span className="text-sm">Chapter</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">Digital</div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-green-600" />
                      <span className="text-sm">Article</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-cyan-600" />
                      <span className="text-sm">Website</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">Media</div>
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-pink-600" />
                      <span className="text-sm">Video</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">Technology</div>
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-gray-700" />
                      <span className="text-sm">Software</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-gray-600" />
                      <span className="text-sm">Hardware</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Extracted Metadata Results */}
            <div className="max-w-6xl mx-auto space-y-6">
              <h2 className="text-xl font-semibold">Extracted Metadata</h2>

              {extractedResults.map((result, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      {result.filename}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Render all metadata fields EXCEPT reading_materials first */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                      {Object.entries(result.metadata).filter(([key]) => key !== "reading_materials").map(([key, value]) => {
                        if (key === "main_topic") {
                          // Shorten main topic summary
                          const shortValue = typeof value === 'string' && value.length > 200 
                            ? value.substring(0, 200) + '...' 
                            : value
                          return (
                            <div key={key} className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium capitalize">
                                  {key.replace("_", " ")}
                                </span>
                              </div>
                              <span className="text-sm text-muted-foreground">{String(shortValue)}</span>
                            </div>
                          )
                        }
                        
                        return (
                          <div key={key} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium capitalize">
                                {key.replace("_", " ")}
                              </span>
                            </div>
                            {Array.isArray(value) ? (
                              <ul className="list-disc list-inside space-y-1 text-sm">
                                {value.map((item, idx) => (
                                  <li key={idx} className="text-muted-foreground">
                                    {typeof item === 'object' ? item.title || JSON.stringify(item) : item}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-sm text-muted-foreground">{String(value)}</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    
                    {/* Render reading_materials LAST, taking full width */}
                    {result.metadata.reading_materials && Array.isArray(result.metadata.reading_materials) && (() => {
                      const key = "reading_materials"
                      const value = result.metadata.reading_materials
                      
                      const getTypeIcon = (type: string) => {
                            switch (type.toLowerCase()) {
                              case 'book':
                              case 'books':
                                return BookMarked
                              case 'journal_article':
                              case 'journal articles':
                                return FileText
                              case 'book_chapter':
                              case 'book chapters':
                                return BookOpen
                              case 'website':
                              case 'websites':
                                return Globe
                              case 'video':
                              case 'videos':
                                return Video
                              case 'software':
                                return Monitor
                              case 'hardware':
                                return HardDrive
                              case 'equipment':
                                return Wrench
                              default:
                                return BookMarked
                            }
                          }
                          
                          const getTypeBadgeColor = (type: string, isRequired: boolean) => {
                            // Don't override required items with type-specific colors
                            if (isRequired) return "destructive"
                            
                            // Return custom color classes for each type
                            switch (type.toLowerCase()) {
                              case 'book':
                              case 'books':
                                return "bg-blue-100 text-blue-700 border-blue-300"
                              case 'book_chapter':
                              case 'book chapters':
                                return "bg-purple-100 text-purple-700 border-purple-300"
                              case 'journal_article':
                              case 'journal articles':
                                return "bg-green-100 text-green-700 border-green-300"
                              case 'website':
                              case 'websites':
                                return "bg-cyan-100 text-cyan-700 border-cyan-300"
                              case 'video':
                              case 'videos':
                                return "bg-pink-100 text-pink-700 border-pink-300"
                              case 'software':
                                return "bg-gray-100 text-gray-800 border-gray-400"
                              case 'hardware':
                                return "bg-gray-100 text-gray-800 border-gray-400"
                              case 'equipment':
                                return "bg-gray-100 text-gray-800 border-gray-400"
                              default:
                                return "bg-gray-100 text-gray-700 border-gray-300"
                            }
                          }
                          
                          // Calculate statistics
                          const materials = Array.isArray(value) ? value : []
                          const requiredCount = materials.filter(item => 
                            typeof item === 'object' && item?.requirement === 'required'
                          ).length
                          const suggestedCount = materials.length - requiredCount
                          
                          // Count by type
                          const typeCounts: Record<string, number> = {}
                          materials.forEach(item => {
                            if (typeof item === 'object' && item !== null) {
                              const type = item.type || 'book'
                              typeCounts[type] = (typeCounts[type] || 0) + 1
                            }
                          })
                          
                          return (
                            <div key={key} className="space-y-4">
                              <div className="flex items-center gap-2">
                                <BookOpen className="w-5 h-5" />
                                <span className="font-semibold text-lg capitalize">
                                  {key.replace("_", " ")}
                                </span>
                              </div>
                              
                              {/* Summary Badges */}
                              <div className="flex flex-wrap gap-2 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                                <Badge variant="default" className="text-sm px-3 py-1 bg-sky-600">
                                  Total: {materials.length}
                                </Badge>
                                <Badge variant="destructive" className="text-sm px-3 py-1 flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3" />
                                  Required: {requiredCount}
                                </Badge>
                                <Badge variant="secondary" className="text-sm px-3 py-1 flex items-center gap-1">
                                  <Sparkles className="w-3 h-3" />
                                  Suggested: {suggestedCount}
                                </Badge>
                                {Object.entries(typeCounts).map(([type, count]) => (
                                  <Badge key={type} variant="outline" className="text-sm px-3 py-1 capitalize">
                                    {type.replace('_', ' ')}: {count}
                                  </Badge>
                                ))}
                              </div>
                              
                              {/* Material cards in responsive grid: 1 col on mobile, 2 on tablet, 3 on desktop, 4 on large screens */}
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {value
                                  .sort((a, b) => {
                                    // Sort required items first
                                    const aRequired = (typeof a === 'object' && a?.requirement === 'required') ? 0 : 1
                                    const bRequired = (typeof b === 'object' && b?.requirement === 'required') ? 0 : 1
                                    return aRequired - bRequired
                                  })
                                  .map((item, idx) => {
                                  if (typeof item === 'object' && item !== null) {
                                    const title = item.title || 'Unknown Title'
                                    const type = item.type || 'book'
                                    const creator = item.creator || item.author
                                    const isRequired = item.requirement === 'required'
                                    const url = item.url
                                    const isbn = item.ISBN
                                    const hasValidUrl = url && url.toLowerCase() !== 'unknown' && url.toLowerCase() !== 'none' && url.trim() !== ''
                                    const hasValidISBN = isbn && isbn.toLowerCase() !== 'unknown' && isbn.toLowerCase() !== 'none' && isbn.trim() !== ''
                                    const TypeIcon = getTypeIcon(type)
                                    
                                    return (
                                      <div key={idx} className="flex flex-col gap-2 p-3 bg-muted/30 rounded-lg border hover:shadow-md transition-shadow">
                                        <div className="flex items-start gap-2">
                                          {isRequired ? (
                                            <ShieldCheck className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                          ) : (
                                            <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                          )}
                                          <div className="flex-1 min-w-0">
                                            <p className="font-medium text-foreground text-sm leading-tight">{title}</p>
                                            {creator && <p className="text-xs text-muted-foreground mt-1">by {creator}</p>}
                                            {hasValidISBN && <p className="text-xs text-muted-foreground mt-0.5 font-mono">ISBN: {isbn}</p>}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <TypeIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                          {isRequired ? (
                                            <Badge variant="destructive" className="text-xs px-2 py-0.5">
                                              Required
                                            </Badge>
                                          ) : (
                                            <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                              Suggested
                                            </Badge>
                                          )}
                                          <Badge className={`text-xs px-2 py-0.5 capitalize border ${getTypeBadgeColor(type, false)}`}>
                                            {type.replace('_', ' ')}
                                          </Badge>
                                        </div>
                                        {hasValidUrl && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full h-7 text-xs mt-1"
                                            onClick={() => window.open(url, "_blank")}
                                          >
                                            <Globe className="w-3 h-3 mr-1" />
                                            Access Resource
                                          </Button>
                                        )}
                                      </div>
                                    )
                                  } else {
                                    return (
                                      <div key={idx} className="flex flex-col gap-2 p-3 bg-muted/30 rounded-lg border hover:shadow-md transition-shadow">
                                        <div className="flex items-start gap-2">
                                          <BookMarked className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                          <p className="font-medium text-foreground text-sm flex-1">{String(item)}</p>
                                        </div>
                                        <Badge variant="secondary" className="text-xs px-2 py-0.5 w-fit">
                                          Book
                                        </Badge>
                                      </div>
                                    )
                                  }
                                })}
                              </div>
                            </div>
                          )
                        })()}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Library Resource Matches - Grouped by Syllabus */}
            <div className="max-w-6xl mx-auto space-y-6">
              <h2 className="text-xl font-semibold">Library Resource Matches</h2>
              
              {libraryMatches.length === 0 ? (
                <Card>
                  <CardContent className="py-8">
                    {!selectedFields.includes("reading_materials") ? (
                      <div className="text-center">
                        <Book className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-muted-foreground">
                          No reading materials selected for library matching.
                        </p>
                      </div>
                    ) : libraryMatchingStatus.error ? (
                      <div className="text-center space-y-4">
                        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                        <div>
                          <p className="text-red-600 font-medium mb-2">Library Matching Error</p>
                          <p className="text-sm text-muted-foreground mb-4">{libraryMatchingStatus.error}</p>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setLibraryMatchingStatus({ isProcessing: false, progress: 0, message: "", error: null })
                              if (currentJob) startPrimoCheck(currentJob.job_id)
                            }}
                          >
                            Retry Library Matching
                          </Button>
                        </div>
                      </div>
                    ) : libraryMatchingStatus.isProcessing ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-center gap-3 mb-4">
                          <Loader2 className="w-6 h-6 animate-spin text-accent" />
                          <span className="font-medium">Matching Library Resources</span>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>{libraryMatchingStatus.progress}%</span>
                          </div>
                          <Progress value={libraryMatchingStatus.progress} className="w-full" />
                        </div>
                        
                        <p className="text-sm text-muted-foreground text-center">
                          {libraryMatchingStatus.message || "Searching library catalog for reading materials..."}
                        </p>
                        
                        <div className="text-xs text-muted-foreground text-center space-y-1">
                          <p>• Analyzing extracted reading materials</p>
                          <p>• Searching library catalog via Primo API</p>
                          <p>• Checking availability and formats</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Book className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-muted-foreground mb-4">
                          Ready to search library resources for reading materials.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            if (currentJob) {
                              setLibraryMatchingStatus({
                                isProcessing: true,
                                progress: 0,
                                message: "Starting library resource matching...",
                                error: null
                              })
                              startPrimoCheck(currentJob.job_id)
                            }
                          }}
                        >
                          Start Library Matching
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                // Group library matches by syllabus filename
                (() => {
                  const groupedMatches: { [filename: string]: LibraryMatch[] } = {}
                  
                  // First, try to group by associating matches with syllabi
                  extractedResults.forEach((result) => {
                    if (result.library_matches && Array.isArray(result.library_matches)) {
                      groupedMatches[result.filename] = result.library_matches
                    }
                  })
                  
                  // If no grouped matches found, fall back to original ungrouped display
                  if (Object.keys(groupedMatches).length === 0) {
                    libraryMatches.forEach((match, index) => {
                      const key = `ungrouped_${index}`
                      if (!groupedMatches[key]) groupedMatches[key] = []
                      groupedMatches[key].push(match)
                    })
                  }
                  
                  return Object.entries(groupedMatches).map(([filename, matches]) => (
                    <Card key={filename} className="overflow-hidden">
                      <CardHeader className="bg-muted/30">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileText className="w-5 h-5" />
                          {filename.startsWith('ungrouped_') ? 'Library Resources' : filename}
                        </CardTitle>
                        <CardDescription>
                          {matches.length} {matches.length === 1 ? 'resource query' : 'resource queries'} from this syllabus
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-6">
                        {/* Grid layout for query items: 1 col mobile, 2 col tablet, 3 col desktop+ */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {matches.map((match, matchIndex) => (
                            <div key={matchIndex} className="flex flex-col gap-3 p-4 bg-muted/20 rounded-lg border">
                              <div className="flex flex-col gap-2">
                                <h4 className="font-medium text-sm leading-tight">{match.originalQuery}</h4>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline" className="text-xs">
                                    Match: {(match.matchScore * 100).toFixed(0)}%
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {match.matches.length} {match.matches.length === 1 ? "result" : "results"}
                                  </Badge>
                                </div>
                              </div>
                              
                              {match.matches.length > 0 ? (
                                <div className="space-y-2">
                                  {match.matches.slice(0, 1).map((resource, resourceIndex) => (
                                    <LibraryResourceCard key={resourceIndex} resource={resource} />
                                  ))}
                                  {match.matches.length > 1 && (
                                    <p className="text-xs text-muted-foreground text-center py-1">
                                      + {match.matches.length - 1} more {match.matches.length - 1 === 1 ? 'result' : 'results'}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 py-2 px-3 bg-white rounded border border-dashed">
                                  <Book className="w-4 h-4 text-muted-foreground opacity-50 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-xs text-muted-foreground truncate">Not Found</p>
                                  </div>
                                  <Badge variant="outline" className="text-xs text-gray-600 border-gray-300">
                                    Request
                                  </Badge>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                })()
              )}
            </div>

            {/* Action Buttons */}
            <div className="max-w-4xl mx-auto flex justify-center gap-4">
              <Button variant="outline" onClick={resetAnalysis}>
                Analyze New Syllabi
              </Button>
              <div className="flex gap-2">
                <Button onClick={downloadResults} variant="outline" className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export JSON
                </Button>
                <Button onClick={downloadCSV} className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  Export CSV
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Error Dashboard - Fixed bottom position */}
      {errorHistory.length > 0 && (
        <div className={`fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg transition-transform duration-300 z-50 opacity-100 ${
          showErrorDashboard ? 'translate-y-0' : 'translate-y-full'
        }`}>
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="font-medium text-sm">
                  Error Dashboard ({errorHistory.length} {errorHistory.length === 1 ? 'error' : 'errors'})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllErrors}
                  className="text-xs"
                >
                  Clear All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowErrorDashboard(!showErrorDashboard)}
                >
                  {showErrorDashboard ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {showErrorDashboard && (
              <div className="max-h-40 overflow-y-auto py-2 bg-white">
                {errorHistory.map((error) => (
                  <div
                    key={error.id}
                    className={`flex items-start gap-3 py-2 px-3 mb-2 rounded-lg border ${
                      error.source === 'backend' 
                        ? 'bg-red-100 border-red-300' 
                        : 'bg-gray-100 border-gray-400'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <div className={`w-2 h-2 rounded-full ${
                        error.source === 'backend' ? 'bg-red-600' : 'bg-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs font-medium ${
                              error.source === 'backend' 
                                ? 'bg-red-200 text-red-800 border-red-400' 
                                : 'bg-gray-200 text-gray-800 border-gray-500'
                            }`}
                          >
                            {error.source}
                          </Badge>
                          {error.step && (
                            <Badge variant="secondary" className="text-xs">
                              {error.step}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {error.timestamp}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => clearError(error.id)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className={`text-sm font-medium ${
                        error.source === 'backend' ? 'text-red-900' : 'text-gray-900'
                      }`}>{error.message}</p>
                      {error.details && (
                        <p className={`text-xs mt-1 truncate ${
                          error.source === 'backend' ? 'text-red-700' : 'text-gray-700'
                        }`}>{error.details}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
