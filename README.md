# Starfire: AI-Native Intelligence Platform

Starfire is a comprehensive AI-powered platform. It leverages AWS Bedrock, LangChain, and modern web technologies to provide intelligent data processing, analysis, and visualization capabilities.

## Overview

Starfire helps transform raw data into actionable commercial intelligence through:

- **Data Ingestion & Analysis**: Upload and automatically analyze documents with AI
- **Knowledge Base Querying**: Ask questions about your data with natural language
- **Interactive Chat**: Engage in conversations with context-aware AI assistance
- **Data Visualization**: Generate insightful charts and presentations from your data

## Key Features

### Upload & Document Management
- File upload with drag-and-drop support
- Automatic document analysis using AWS Bedrock
- Document categorization and summarization
- Paginated document listing with sorting and filtering
- Document selection for batch operations

### Knowledge Base Analysis
- Interactive data visualization dashboard
- AI-generated charts (bar, line, pie, radar, scatter)
- Automatic insight generation from document data
- Export to PowerPoint presentations and PDF reports

### AI Chat Interface
- Context-aware conversations about your data
- Chat history management with session saving
- Real-time streaming responses via WebSockets
- Citations and references to source documents

## Technology Stack

- **Frontend**: React, TypeScript, Vite
- **UI Components**: shadcn/ui, Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **Visualization**: Recharts, shadcn/ui chart components
- **API Communication**: WebSockets, REST API

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Access to Starfire backend API

### Environment Setup

Create a `.env` file in the project root with the following variables:

```env
VITE_BACKEND_URL=http://localhost:8000
VITE_API_KEY=your-api-key
```

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
src/
├── components/         # UI components
│   ├── projects/       # Project-specific components
│   │   ├── Upload.tsx  # Document upload & management
│   │   ├── Analyze.tsx # Data analysis & visualization
│   │   ├── Chat.tsx    # AI chat interface
│   ├── ui/             # shadcn/ui components
├── pages/              # Application pages
│   ├── dashboard.tsx   # Main dashboard
├── lib/                # Utility functions
```

## Development Notes

- The application uses React Query for data fetching and caching
- WebSocket connections are used for real-time chat functionality
- Pagination is implemented for document listing (10 items per page)
- Visualization components use Recharts for rendering charts
