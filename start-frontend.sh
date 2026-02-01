#!/bin/bash

# Syllabus Analyzer Frontend Startup Script

echo "🚀 Starting Syllabus Analyzer Frontend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    echo "   Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if pnpm is installed (preferred) or fall back to npm
if command -v pnpm &> /dev/null; then
    PACKAGE_MANAGER="pnpm"
elif command -v npm &> /dev/null; then
    PACKAGE_MANAGER="npm"
else
    echo "❌ Neither pnpm nor npm is installed."
    echo "   Please install Node.js and npm from https://nodejs.org/"
    echo "   Or install pnpm with: npm install -g pnpm"
    exit 1
fi

# Navigate to project root
cd "$(dirname "$0")"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies with $PACKAGE_MANAGER..."
    $PACKAGE_MANAGER install
fi

# Set environment variable for API URL
export NEXT_PUBLIC_API_URL="http://localhost:8000"

# Start the Next.js development server
echo "🌟 Starting Next.js development server on http://localhost:3000 (using $PACKAGE_MANAGER)"
echo "🔗 Make sure the backend is running on http://localhost:8000"
echo "🛑 Press Ctrl+C to stop the server"
echo ""

$PACKAGE_MANAGER run dev
