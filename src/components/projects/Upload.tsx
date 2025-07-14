import React, { useState, useMemo } from 'react';
import { LuExpand, LuSearch, LuTrash2, LuFile, LuFileText, LuFileImage, LuUpload } from "react-icons/lu";
import { ArrowUpDown } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Checkbox } from '../ui/checkbox';
import { cn } from '@/lib/utils';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
/* import { FileUpload } from "@/components/ui/file-upload"; */

interface Document {
  id: string;
  version: string;
  name: string;
  type: string;
  size: number;
  summary: string;
  key_topics: string[];
  data_classification: string;
  upload_timestamp: string;
  s3_key: string;
  s3_bucket: string;
  content_type: string;
  last_modified: string;
}

interface UploadingDocument {
  id: string;
  name: string;
  size: number;
  isUploading: true;
}

interface DocumentsResponse {
  data: Document[];
  pagination: {
    page: number;
    pageCount: number;
    hasMore: boolean;
    totalPages: number;
  };
}

// API Configuration
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const API_KEY = import.meta.env.VITE_APIKEY || '';

// API Functions
const fetchDocuments = async ({ page = 1, pageCount = 10 }: { page?: number, pageCount?: number } = {}): Promise<DocumentsResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/ingest?page=${page}&pageCount=${pageCount}`, {
    headers: {
      'Api-Key': API_KEY
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

const uploadDocuments = async (files: File[]) => {
  const formData = new FormData();
  
  files.forEach(file => {
    formData.append('file', file);
  });
  
  const response = await fetch(`${API_BASE_URL}/api/ingest`, {
    method: 'POST',
    headers: {
      'Api-Key': API_KEY
    },
    body: formData
  });
  
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
};

export function Upload() {
  const queryClient = useQueryClient();
  
  // Local state
  const [uploadingDocuments, setUploadingDocuments] = useState<UploadingDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<keyof Document | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [files, setFiles] = useState<File[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10; // Number of documents per page
  
  // TanStack Query for fetching documents
  const { data: documentsResponse, isLoading: isLoadingDocuments, error: documentsError } = useQuery({
    queryKey: ['documents', currentPage, pageSize],
    queryFn: () => fetchDocuments({ page: currentPage, pageCount: pageSize }),
  });
  
  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: uploadDocuments,
    onSuccess: () => {
      // Invalidate and refetch documents after successful upload
      queryClient.invalidateQueries({ queryKey: ['documents', currentPage, pageSize] });
      setUploadingDocuments([]);
    },
    onError: (error) => {
      setUploadingDocuments([]);
      console.error('Upload error:', error);
    },
  });
  
  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const handleNextPage = () => {
    if (documentsResponse?.pagination.hasMore) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Derived state from query
  const documents = documentsResponse?.data || [];
  const isUploading = uploadMutation.isPending;
  const uploadError = uploadMutation.error?.message || null;

  // Utility functions
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Modal functions
  const openDocumentModal = (doc: Document) => {
    setSelectedDocument(doc);
    setIsModalOpen(true);
  };

  const closeDocumentModal = () => {
    setIsModalOpen(false);
    setSelectedDocument(null);
  };


  // Helper functions for cards
  const getFileIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('pdf') || lowerType.includes('document')) {
      return <LuFileText className="h-5 w-5 text-red-500" />;
    } else if (lowerType.includes('image') || lowerType.includes('png') || lowerType.includes('jpg')) {
      return <LuFileImage className="h-5 w-5 text-blue-500" />;
    }
    return <LuFile className="h-5 w-5 text-gray-500" />;
  };


  // Handle sort functionality (from ChatComponent.tsx)
  const handleSort = (field: keyof Document) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filter and sort documents (only actual documents, not uploading ones)
  const filteredAndSortedDocuments = useMemo(() => {
    let filtered = documents;
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = documents.filter(doc => 
        doc.name.toLowerCase().includes(query) ||
        doc.type.toLowerCase().includes(query) ||
        (doc.summary || '').toLowerCase().includes(query) ||
        (Array.isArray(doc.key_topics) ? doc.key_topics.some(topic => topic.toLowerCase().includes(query)) : false)
      );
    }
    
    // Sort documents
    if (sortField) {
      return [...filtered].sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];
        
        // Handle different data types
        if (sortField === 'size') {
          aValue = Number(aValue) || 0;
          bValue = Number(bValue) || 0;
        } else if (sortField === 'upload_timestamp') {
          aValue = new Date(String(aValue)).getTime();
          bValue = new Date(String(bValue)).getTime();
        } else {
          aValue = String(aValue || '').toLowerCase();
          bValue = String(bValue || '').toLowerCase();
        }
        
        if (sortOrder === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });
    }
    
    return filtered;
  }, [documents, searchQuery, sortField, sortOrder]);


  // Toggle document selection
  const toggleDocumentSelection = (docId: string) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocuments(newSelected);
  };


  // FileUpload component (based on aceternity design)
  const FileUpload = ({
    onChange,
  }: {
    onChange?: (files: File[]) => void;
  }) => {
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      const newFiles = [...files, ...droppedFiles];
      setFiles(newFiles);
      onChange && onChange(newFiles);
      
      // Auto-upload the dropped files immediately
      handleUploadFiles(droppedFiles);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const selectedFiles = Array.from(e.target.files);
        const newFiles = [...files, ...selectedFiles];
        setFiles(newFiles);
        onChange && onChange(newFiles);
        
        // Auto-upload the newly selected files immediately
        handleUploadFiles(selectedFiles);
      }
    };

    const removeFile = (index: number) => {
      const newFiles = files.filter((_, i) => i !== index);
      setFiles(newFiles);
      onChange && onChange(newFiles);
    };

    return (
      <div className="w-full">
        <div
          className={cn(
            "relative border-2 border-dashed rounded-lg p-8 transition-colors",
            isDragOver
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.md,.xlsx,.csv"
            onChange={handleInputChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />
          
          <div className="text-center">
            <LuUpload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <div className="text-lg font-medium text-gray-900 mb-2">
              Drop files here or click to select
            </div>
            <div className="text-sm text-gray-500">
              Files will upload automatically • Supports PDF, DOC, DOCX, TXT, MD, XLSX, CSV
            </div>
          </div>
        </div>

        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="text-sm font-medium text-gray-700">
              Processing files ({files.length})
            </div>
            <div className="space-y-2 max-h-1.52 overflow-y-auto">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                >
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    {getFileIcon(file.type)}
                    <span className="text-sm text-gray-900 truncate" title={file.name}>
                      {file.name}
                    </span>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700 p-0.5"
                    disabled={isUploading}
                  >
                    <LuTrash2 className="h-2 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Handle file upload using TanStack Query mutation
  const handleUploadFiles = async (filesToUpload: File[]) => {
    if (filesToUpload.length === 0) return;
    
    // Create skeleton documents for all files immediately
    const skeletonDocs: UploadingDocument[] = filesToUpload.map(file => ({
      id: `uploading-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      name: file.name,
      size: file.size,
      isUploading: true
    }));
    
    // Add all skeletons to uploading documents list
    setUploadingDocuments(prev => [...prev, ...skeletonDocs]);
    
    try {
      const result = await uploadMutation.mutateAsync(filesToUpload);
      console.log('Upload successful:', result);
      
      // Remove uploaded files from the preview list
      const uploadedFileNames = filesToUpload.map(f => f.name);
      setFiles(prev => prev.filter(file => !uploadedFileNames.includes(file.name)));
      
      // Show success message
      const fileCount = filesToUpload.length;
      const successCount = result.summary?.successful || fileCount;
      const failedCount = result.summary?.failed || 0;
      
      if (failedCount > 0) {
        console.log(`${successCount} of ${fileCount} documents uploaded successfully!`);
      } else {
        console.log(`${fileCount} document${fileCount > 1 ? 's' : ''} uploaded successfully!`);
      }
      
      return result;
    } catch (error) {
      console.error('Error uploading documents:', error);
      
      // Remove all skeletons from uploading list on error
      const skeletonIds = skeletonDocs.map(doc => doc.id);
      setUploadingDocuments(prev => prev.filter(doc => !skeletonIds.includes(doc.id)));
      
      throw error;
    }
  };


  return (
    <div className="flex flex-col h-full min-w-0 p-4 pt-0 gap-4">
      {/* Upload Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
      {/*   <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Documents</h3>
          <p className="text-sm text-gray-600">Upload files to analyze and manage</p>
        </div> */}
        
        <FileUpload onChange={(files) => setFiles(files)} />
        
  
        
        {uploadError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mt-4">
            {uploadError}
          </div>
        )}
      </div>

      {/* Documents Section */}
      <div className="flex-1 bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col min-h-0">
        {/* Header with Search and Controls */}
        <div className="bg-gray-50 border-b border-gray-200 p-4 flex-shrink-0">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Title and Selection Count */}
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
              {selectedDocuments.size > 0 && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  {selectedDocuments.size} selected
                </span>
              )}
            </div>
            
            {/* Search and Sort */}
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
              {/* Search */}
              <div className="relative">
                <LuSearch className="absolute left-3 top-0.5/2 transform -translate-y-1/2 text-gray-400 h-2 w-3" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              {/* Sort */}
              <select
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={`${sortField || ''}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  if (field) {
                    setSortField(field as keyof Document);
                    setSortOrder(order as 'asc' | 'desc');
                  } else {
                    setSortField(null);
                  }
                }}
              >
                <option value="-">No sorting</option>
                <option value="upload_timestamp-desc">Latest First</option>
                <option value="upload_timestamp-asc">Oldest First</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="size-desc">Largest First</option>
                <option value="size-asc">Smallest First</option>
                <option value="type-asc">Type A-Z</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Simple HTML Table */}
        <div className="flex-1 overflow-auto flex flex-col">
          <table className="w-full table-fixed flex-1">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="w-[8%] px-2 py-1.5 text-left text-xs font-medium text-gray-600">
                  Select
                </th>
                <th className="w-[30%] px-2 py-1.5 text-left text-xs font-medium text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>Name</span>
                    <button
                      onClick={() => handleSort('name')}
                      className="ml-1 hover:bg-gray-200 p-0.5 rounded"
                      title="Sort by name"
                    >
                      <ArrowUpDown className="h-1.5 w-3" />
                    </button>
                  </div>
                </th>
                <th className="w-[35%] px-2 py-1.5 text-left text-xs font-medium text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>Summary</span>
                    <button
                      onClick={() => handleSort('summary')}
                      className="ml-1 hover:bg-gray-200 p-0.5 rounded"
                      title="Sort by summary"
                    >
                      <ArrowUpDown className="h-1.5 w-3" />
                    </button>
                  </div>
                </th>
                <th className="w-[25%] px-2 py-1.5 text-left text-xs font-medium text-gray-600">
                  Key Topics
                </th>
                <th className="w-[2%] px-2 py-1.5 text-left text-xs font-medium text-gray-600">
                  {/* Actions column - reserved for future use */}
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Uploading Documents */}
              {uploadingDocuments.map((uploadingDoc) => (
                <tr key={uploadingDoc.id} className="border-b border-gray-100 bg-blue-50 hover:bg-blue-100">
                  <td className="px-1 py-0 align-middle">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-2 flex-shrink-0"></div>
                      <div className="animate-spin text-blue-600 flex-shrink-0">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 12a9 9 0 11-6.219-8.56"/>
                        </svg>
                      </div>
                    </div>
                  </td>
                  <td className="px-1 py-0 align-middle">
                    <div className="flex items-center gap-1">
                      <span className="truncate text-blue-700" title={uploadingDoc.name}>
                        {uploadingDoc.name}
                      </span>
                      <span className="text-xs text-blue-600 ml-auto whitespace-nowrap">Uploading...</span>
                    </div>
                  </td>
                  <td className="px-1 py-0 align-middle">
                    <div className="animate-pulse bg-blue-200 h-1.5 w-24 rounded"></div>
                  </td>
                  <td className="px-1 py-0 align-middle">
                    <div className="flex gap-0.5">
                      <div className="animate-pulse bg-blue-200 h-2 w-12 rounded-sm"></div>
                      <div className="animate-pulse bg-blue-200 h-2 w-8 rounded-sm"></div>
                    </div>
                  </td>
                  <td className="px-1 py-0 align-middle"></td>
                </tr>
              ))}
              
              {/* Loading State */}
              {isLoadingDocuments && Array.from({ length: 5 }, (_, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-1 py-0 align-middle">
                    <div className="animate-pulse bg-gray-200 h-2 w-8 rounded"></div>
                  </td>
                  <td className="px-1 py-0 align-middle">
                    <div className="animate-pulse bg-gray-200 h-2 w-32 rounded"></div>
                  </td>
                  <td className="px-1 py-0 align-middle">
                    <div className="animate-pulse bg-gray-200 h-2 w-38 rounded"></div>
                  </td>
                  <td className="px-1 py-0 align-middle">
                    <div className="flex gap-0.5">
                      <div className="animate-pulse bg-gray-200 h-2 w-12 rounded-sm"></div>
                      <div className="animate-pulse bg-gray-200 h-2 w-8 rounded-sm"></div>
                    </div>
                  </td>
                  <td className="px-1 py-0 align-middle"></td>
                </tr>
              ))}
              
              {/* Error State */}
              {documentsError && (
                <tr className="border-b border-gray-100">
                  <td colSpan={5} className="px-1 py-0 text-center text-xs text-red-600">
                    Error: {documentsError instanceof Error ? documentsError.message : 'Failed to fetch documents'}
                  </td>
                </tr>
              )}
              
              {/* Documents */}
              {!isLoadingDocuments && !documentsError && filteredAndSortedDocuments.map((doc) => (
                <tr
                  key={doc.id}
                  className={cn(
                    "border-b border-gray-100 hover:bg-gray-50",
                    selectedDocuments.has(doc.id) ? "bg-blue-50" : ""
                  )}
                >
                  <td className="px-1 py-0 align-middle">
                    <div className="flex items-center gap-1">
                      <Checkbox 
                        checked={selectedDocuments.has(doc.id)}
                        onCheckedChange={() => toggleDocumentSelection(doc.id)}
                        className="flex-shrink-0"
                      />
                      <button 
                        className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                        onClick={() => openDocumentModal(doc)}
                        title="View document details"
                      >
                        <LuExpand size={10} />
                      </button>
                    </div>
                  </td>
                  <td className="px-1 py-0 align-middle">
                    <span className="truncate inline-block" title={String(doc.name || '')}>
                      {String(doc.name || '')}
                    </span>
                  </td>
                  <td className="px-1 py-0 align-middle">
                    <span className="truncate inline-block" title={String(doc.summary || '')}>
                      {String(doc.summary || '')}
                    </span>
                  </td>
                  <td className="px-1 py-0 align-middle">
                    <div className="flex gap-0.5 overflow-hidden">
                      {Array.isArray(doc.key_topics) && doc.key_topics.length > 0 ? (
                        <>
                          {doc.key_topics.slice(0, 3).map((topic, index) => {
                            const colorIndex = (index % 12) + 1;
                            return (
                              <span
                                key={index}
                                className={`px-1 py-0 rounded-sm text-xs topic-color-${colorIndex} whitespace-nowrap flex-shrink-0`}
                                title={topic}
                              >
                                {topic}
                              </span>
                            );
                          })}
                          {doc.key_topics.length > 3 && (
                            <span className="px-1 py-0 rounded-sm text-xs bg-gray-100 text-gray-600 whitespace-nowrap flex-shrink-0">
                              +{doc.key_topics.length - 3} more
                            </span>
                          )}
                        </>
                      ) : doc.key_topics && typeof doc.key_topics === 'string' && String(doc.key_topics).trim() ? (
                        <span className="px-1 py-0 rounded-sm text-xs topic-color-1" title={String(doc.key_topics)}>
                          {String(doc.key_topics)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">No topics</span>
                      )}
                    </div>
                  </td>
                  <td className="px-1 py-0 align-middle"></td>
                </tr>
              ))}
              
              {/* Empty State */}
              {!isLoadingDocuments && !documentsError && filteredAndSortedDocuments.length === 0 && uploadingDocuments.length === 0 && (
                <tr className="border-b border-gray-100">
                  <td colSpan={5} className="px-3 py-4 text-center text-gray-500">
                    {searchQuery ? 'No documents match your search' : 'No documents found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          {/* Pagination */}
          {documentsResponse && documentsResponse.pagination.totalPages > 1 && (
            <div className="py-4 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={handlePreviousPage}
                      className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {/* Generate page numbers */}
                  {Array.from({ length: documentsResponse.pagination.totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Show first page, last page, current page, and pages around current page
                      return (
                        page === 1 || 
                        page === documentsResponse.pagination.totalPages ||
                        Math.abs(page - currentPage) <= 1
                      );
                    })
                    .map((page, index, array) => {
                      // If there's a gap between pages, show ellipsis
                      if (index > 0 && page - array[index - 1] > 1) {
                        return (
                          <React.Fragment key={`ellipsis-${page}`}>
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                            <PaginationItem key={page}>
                              <PaginationLink 
                                onClick={() => handlePageChange(page)}
                                isActive={page === currentPage}
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          </React.Fragment>
                        );
                      }
                      
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink 
                            onClick={() => handlePageChange(page)}
                            isActive={page === currentPage}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={handleNextPage}
                      className={!documentsResponse.pagination.hasMore ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </div>

      {/* Document Detail Modal */}
      {isModalOpen && selectedDocument && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closeDocumentModal}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">
                Document Details
              </h2>
              <button 
                onClick={closeDocumentModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Document Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Document Name</label>
                <p className="text-base text-gray-900 bg-gray-50 p-3 rounded-md">
                  {selectedDocument.name || 'N/A'}
                </p>
              </div>
              
              {/* Document Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <p className="text-base text-gray-900 bg-gray-50 p-3 rounded-md">
                  {selectedDocument.type || 'N/A'}
                </p>
              </div>
              
              {/* File Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">File Size</label>
                <p className="text-base text-gray-900 bg-gray-50 p-3 rounded-md">
                  {formatFileSize(selectedDocument.size || 0)}
                </p>
              </div>
              
              {/* Summary */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Summary</label>
                <p className="text-base text-gray-900 bg-gray-50 p-3 rounded-md leading-relaxed">
                  {selectedDocument.summary || 'No summary available'}
                </p>
              </div>
              
              {/* Key Topics */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Key Topics</label>
                <div className="bg-gray-50 p-3 rounded-md">
                  {Array.isArray(selectedDocument.key_topics) && selectedDocument.key_topics.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {selectedDocument.key_topics.map((topic, index) => {
                        const colorIndex = (index % 12) + 1;
                        return (
                          <span
                            key={index}
                            className={`px-3 py-1 rounded-full text-sm topic-color-${colorIndex}`}
                          >
                            {topic}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500">No topics available</p>
                  )}
                </div>
              </div>
              
              {/* Data Classification */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data Classification</label>
                <p className="text-base text-gray-900 bg-gray-50 p-3 rounded-md">
                  {selectedDocument.data_classification || 'N/A'}
                </p>
              </div>
              
              {/* Upload Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Date</label>
                <p className="text-base text-gray-900 bg-gray-50 p-3 rounded-md">
                  {formatDate(selectedDocument.upload_timestamp || '')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}