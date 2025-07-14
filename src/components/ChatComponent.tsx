import { useState, useEffect, useRef } from 'react';
import { ChatMessage, type Message } from './ui/chat-message';
import { MessageInput } from './ui/message-input';
import { TypingIndicator } from './ui/typing-indicator';
import { LuExpand } from "react-icons/lu";
import { ArrowUpDown, RefreshCw, X, Copy, Check, Pencil } from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './ui/resizable';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from './ui/sheet';
import { Separator } from './ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { DataVisualization } from './DataVisualization';
import { Checkbox } from './ui/checkbox';

interface InternalMessage {
  type: 'query' | 'chunk' | 'response' | 'error' | 'system';
  content: string;
  isComplete?: boolean;
}

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
    limit: number;
    count: number;
    hasMore: boolean;
  };
}

const ChatComponent = () => {
  const [connected, setConnected] = useState(false);
  const [chatMessages, setChatMessages] = useState<InternalMessage[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const sessionId = useRef(`session-${Math.random().toString(36).substring(2, 11)}`);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploadingDocuments, setUploadingDocuments] = useState<UploadingDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVisualizationModalOpen, setIsVisualizationModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<keyof Document | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [copiedMessages, setCopiedMessages] = useState<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const currentResponseIndexRef = useRef<number>(-1);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    "Which drugs in our portfolio show unusual shifts in utilization by state or plan coverage?",
    "Are there prescribing trends that signal emerging competitive threats or formulary changes?",
    "Which high-cost drugs have the greatest impact on overall plan spending and should be prioritized for deeper analysis?",
    "How does recent formulary tiering impact patient adherence and fill rates in key regions?",
    "Which prescribers are driving the highest volume of non-preferred drug utilization?"
  ];

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

  // Visualization modal functions
  const openVisualizationModal = () => {
    setIsVisualizationModalOpen(true);
  };

  const closeVisualizationModal = () => {
    setIsVisualizationModalOpen(false);
  };

  // Checkbox functionality
  const toggleDocumentSelection = (documentId: string) => {
    setSelectedDocuments(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(documentId)) {
        newSelection.delete(documentId);
      } else {
        newSelection.add(documentId);
      }
      return newSelection;
    });
  };

  // Sorting functionality
  const handleSort = (field: keyof Document) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedDocuments = [...documents].sort((a, b) => {
    if (!sortField) return 0;
    
    let aValue = a[sortField];
    let bValue = b[sortField];
    
    // Handle different data types
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // File upload function for multiple files
  const uploadDocuments = async (files: File[]) => {
    if (files.length === 0) return;
    
    // Create skeleton documents for all files immediately
    const skeletonDocs: UploadingDocument[] = files.map(file => ({
      id: `uploading-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      name: file.name,
      size: file.size,
      isUploading: true
    }));
    
    try {
      setIsUploading(true);
      setUploadError(null);
      
      // Add all skeletons to uploading documents list
      setUploadingDocuments(prev => [...prev, ...skeletonDocs]);
      
      const formData = new FormData();
      
      // Append all files to the same FormData
      files.forEach(file => {
        formData.append('file', file);
      });
      
      const response = await fetch('http://localhost:8000/api/ingest', {
        method: 'POST',
        headers: {
          'Api-Key': import.meta.env.VITE_APIKEY || ''
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Upload successful:', result);
      
      // Remove all skeletons from uploading list
      const skeletonIds = skeletonDocs.map(doc => doc.id);
      setUploadingDocuments(prev => prev.filter(doc => !skeletonIds.includes(doc.id)));
      
      // Show success message
      const fileCount = files.length;
      const successCount = result.summary?.successful || fileCount;
      const failedCount = result.summary?.failed || 0;
      
      if (failedCount > 0) {
        console.log(`${successCount} of ${fileCount} documents uploaded successfully!`);
        setUploadError(`${failedCount} documents failed to upload`);
      } else {
        console.log(`${fileCount} document${fileCount > 1 ? 's' : ''} uploaded successfully!`);
      }
      
      // Clear messages after 3 seconds
      setTimeout(() => {
        setUploadError(null);
      }, 3000);
      
      // Refresh the documents list after successful upload
      await fetchDocuments();
      
      return result;
    } catch (error) {
      console.error('Error uploading documents:', error);
      
      // Remove all skeletons from uploading list on error
      const skeletonIds = skeletonDocs.map(doc => doc.id);
      setUploadingDocuments(prev => prev.filter(doc => !skeletonIds.includes(doc.id)));
      
      setUploadError(error instanceof Error ? error.message : 'Failed to upload documents');
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  // Handle file selection and upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // Convert FileList to Array
    const fileArray = Array.from(files);
    
    try {
      await uploadDocuments(fileArray);
      // Reset the input value so the same files can be uploaded again if needed
      event.target.value = '';
    } catch (error) {
      // Error handling is already done in uploadDocuments
    }
  };

  // Fetch documents from API
  const fetchDocuments = async () => {
    try {
      setIsLoadingDocuments(true);
      setDocumentsError(null);
      
      const response = await fetch('http://localhost:8000/api/ingest', {
        headers: {
          'Api-Key': import.meta.env.VITE_APIKEY || ''
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: DocumentsResponse = await response.json();
      // console.log('API Response:', data);
      // console.log('Documents received:', data.data);
      // if (data.data.length > 0) {
      //   console.log('First document:', data.data[0]);
      //   console.log('First document key_topics:', data.data[0].key_topics);
      // }
      setDocuments(data.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocumentsError(error instanceof Error ? error.message : 'Failed to fetch documents');
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  // Render skeleton row for uploading documents
  const renderUploadingRow = (uploadingDoc: UploadingDocument, renderContent: (doc: UploadingDocument) => React.ReactNode) => (
    <div key={uploadingDoc.id} className="border-b border-gray-200 px-4 text-sm text-gray-500 bg-blue-50 h-12 flex items-center">
      <div className="w-full">
        {renderContent(uploadingDoc)}
      </div>
    </div>
  );

  // Render column content with loading/error states and fixed row heights
  const renderColumnContent = (renderDoc: (doc: Document) => React.ReactNode, renderUploading?: (doc: UploadingDocument) => React.ReactNode) => {
    const allRows: React.ReactNode[] = [];
    
    // Add uploading documents first (they appear at the top)
    if (renderUploading) {
      uploadingDocuments.forEach(uploadingDoc => {
        allRows.push(renderUploadingRow(uploadingDoc, renderUploading));
      });
    }
    
    if (isLoadingDocuments) {
      const skeletonRows = Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="border-b border-gray-200 px-4 text-sm text-gray-500 hover:bg-gray-50 h-12 flex items-center">
          <div className="animate-pulse bg-gray-200 h-4 rounded flex-1"></div>
        </div>
      ));
      allRows.push(...skeletonRows);
    } else if (documentsError) {
      allRows.push(
        <div key="error" className="border-b border-gray-200 px-4 text-sm text-red-600 h-12 flex items-center">
          <span className="truncate">Error: {documentsError}</span>
        </div>
      );
    } else if (documents.length > 0) {
      const documentsToRender = sortField ? sortedDocuments : documents;
      const documentRows = documentsToRender.map((doc) => (
        <div key={doc.id} className="border-b border-gray-200 px-4 text-sm text-gray-900 hover:bg-gray-50 h-12 flex items-center">
          <div className="w-full">
            {renderDoc(doc)}
          </div>
        </div>
      ));
      allRows.push(...documentRows);
    } else if (uploadingDocuments.length === 0) {
      allRows.push(
        <div key="no-docs" className="border-b border-gray-200 px-4 text-sm text-gray-500 h-12 flex items-center">
          <span className="truncate">No documents found</span>
        </div>
      );
    }
    
    return allRows;
  };

  // Convert internal messages to shadcn Message format
  useEffect(() => {
    const convertedMessages: Message[] = []
    let messageId = 0;
    
    for (const msg of chatMessages) {
      if (msg.type === 'query') {
        convertedMessages.push({
          id: `user-${messageId++}`,
          role: 'user',
          content: msg.content,
          createdAt: new Date()
        });
      } else if (msg.type === 'chunk' || msg.type === 'response') {
        convertedMessages.push({
          id: `assistant-${messageId++}`,
          role: 'assistant',
          content: msg.content,
          createdAt: new Date()
        });
      }
    }
    
    setMessages(convertedMessages);
  }, [chatMessages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-connect on component mount
  useEffect(() => {
    connect();
    
    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, []);

  // Fetch documents on component mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    const wsUrl = import.meta.env.VITE_WEB_SOCKET_URL || 'ws://localhost:8000/ws/query';
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      setConnected(true);
      addMessage('system', 'Connected to WebSocket');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      //console.log('WebSocket message received:', data);
      
      // Handle different message types
      if (data.type === 'chunk') {
        appendResponseChunk(data.data);
      } else if (data.type === 'end' || data.type === 'done') {
        console.log('End of response received');
        completeCurrentResponse();
        setIsStreaming(false);
        setIsWaitingForResponse(false);
        addMessage('system', '--- End of Response ---');
      } else if (data.type === 'cancelled') {
        console.log('Request cancelled:', data.message);
        completeCurrentResponse();
        // These states should already be false from the cancelRequest function
        // but we set them again just to be sure
        setIsStreaming(false);
        setIsWaitingForResponse(false);
        addMessage('system', `--- Request cancelled: ${data.message} ---`);
      } else if (data.error) {
        setIsStreaming(false); // Stop streaming on error
        setIsWaitingForResponse(false);
        addMessage('error', `Error: ${data.error}`);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      addMessage('system', 'Disconnected from WebSocket');
      
      // Auto-reconnect after 3 seconds
      setTimeout(() => {
        if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
          console.log('Attempting to reconnect...');
          connect();
        }
      }, 3000);
    };

    ws.onerror = (error) => {
      setConnected(false);
      addMessage('error', `WebSocket Error: ${error}`);
    };

    wsRef.current = ws;
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const sendQuery = () => {
    if (!query.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    // Reset streaming state and start waiting for response
    setIsStreaming(false);
    setIsWaitingForResponse(true);
    
    addMessage('query', query);
    wsRef.current.send(JSON.stringify({ 
      query: query,
      sessionId: sessionId.current 
    }));
    setQuery('');
  };

  const addMessage = (type: InternalMessage['type'], content: string, isComplete: boolean = true) => {
    setChatMessages(prev => [...prev, { type, content, isComplete }]);
  };

  const appendResponseChunk = (chunk: string) => {
    // Set streaming state to true and stop waiting when we start receiving chunks
    setIsStreaming(true);
    setIsWaitingForResponse(false);
    
    setChatMessages(prev => {
      // If we're already accumulating a response, append to it
      if (currentResponseIndexRef.current >= 0 && currentResponseIndexRef.current < prev.length) {
        const newMessages = [...prev];
        const currentMessage = newMessages[currentResponseIndexRef.current];
        
        // Safety check to ensure currentMessage exists
        if (currentMessage) {
          newMessages[currentResponseIndexRef.current] = {
            ...currentMessage,
            content: currentMessage.content + chunk
          };
          return newMessages;
        }
      }
      
      // If we don't have a valid current response index or message, start a new one
      currentResponseIndexRef.current = prev.length;
      return [...prev, { type: 'chunk', content: chunk }];
    });
  };

  const completeCurrentResponse = () => {
    // Set streaming state to false when response is complete
    setIsStreaming(false);
    setIsWaitingForResponse(false);
    
    if (currentResponseIndexRef.current >= 0) {
      // Reset for next response
      currentResponseIndexRef.current = -1;
    }
  };

  const handleSubmit = (event?: { preventDefault?: () => void }) => {
    event?.preventDefault?.();
    sendQuery();
  };

  const cancelRequest = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    console.log('Cancelling request for session:', sessionId.current);
    
    // Immediately update UI state to show cancellation is in progress
    setIsStreaming(false);
    setIsWaitingForResponse(false);
    
    // Send cancellation message to server
    wsRef.current.send(JSON.stringify({
      type: 'cancel',
      sessionId: sessionId.current
    }));
    
    // Add a system message indicating cancellation request was sent
    addMessage('system', '--- Cancellation requested ---');
  };

  const handleNewSession = () => {
    // Generate new session ID
    sessionId.current = `session-${Math.random().toString(36).substring(2, 11)}`;
    
    // Clear chat messages
    setChatMessages([]);
    setMessages([]);
    
    // Reset states
    setQuery('');
    setIsStreaming(false);
    setIsWaitingForResponse(false);
    
    // Clear copied messages
    setCopiedMessages(new Set());
    
    // Add system message for new session
    addMessage('system', `New session started: ${sessionId.current}`);
  };

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessages(prev => new Set(prev).add(messageId));
      
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedMessages(prev => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          return newSet;
        });
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const editMessage = (text: string) => {
    setQuery(text);
  };

  return (
    <div className="fixed inset-0 bg-white text-gray-900 flex" style={{ fontFamily: 'var(--font-hanken)' }}>
      {/* Main Panel - Full width */}
      <div className="w-full bg-white">
        {/* Top Navigation */}
        <div className="flex items-center justify-center border-b border-gray-200 px-4 py-2 text-xs relative">
          <div className="flex items-center gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  className="text-sm text-white bg-black hover:bg-gray-800 px-4 py-2 rounded-lg transition-colors"
                  onClick={openVisualizationModal}
                >
                  Visualize
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Generate visualizations from your data</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative">
                  <input
                    type="file"
                    id="document-upload"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    accept=".pdf,.doc,.docx,.txt,.md,.xlsx,.csv"
                    multiple
                  />
                  <button 
                    className="text-sm text-white bg-black hover:bg-gray-800 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isUploading}
                  >
                    {isUploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Upload documents to analyze</p>
              </TooltipContent>
            </Tooltip>
            <Sheet>
              <SheetTrigger asChild>
                <div className="relative cursor-pointer">
                  <div className="px-4 py-2 topic-color-10 hover:bg-gray-800 text-white cursor-pointer focus:outline-none transition-colors rounded-full flex items-center justify-center gap-2 text-sm">
                    <span>Ask Starfire</span>
                  </div>
                </div>
              </SheetTrigger>
              <SheetContent className="w-[60vw] sm:w-[25vw] sm:max-w-none max-w-[900px] flex flex-col" style={{ fontFamily: 'var(--font-hanken)' }}>
                <SheetHeader>
                  <div className="flex items-center justify-between">
                    <SheetTitle>AI Assistant</SheetTitle>
                    <div className="flex items-center gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            className="p-2 bg-black text-white hover:bg-gray-800 rounded-md transition-colors"
                            title="Start new chat"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Start New Chat?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to start a new chat? You will lose your chat history.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleNewSession}>
                              Start New Chat
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <SheetClose asChild>
                        <button
                          className="p-2 bg-black text-white hover:bg-gray-800 rounded-md transition-colors"
                          title="Close chat"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </SheetClose>
                    </div>
                  </div>
                  <Separator className="my-1" />
                </SheetHeader>
               
                
                {/* Session Info */}
                {/* {connected && (
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 px-6 mt-4">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setSessionId(`session-${Math.random().toString(36).substring(2, 11)}`)}
                        className="text-xs text-gray-600 hover:text-gray-900 underline"
                      >
                        New Session
                      </button>
                    </div>
                  </div>
                )} */}
                
                {/* Chat Messages Area - Scrollable */}
                <div className="flex-1 overflow-y-auto px-6 pb-4">
                  {!connected ? (
                    /* Warming up loader */
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                        <p className="text-gray-600 text-sm">Warming up...</p>
                      </div>
                    </div>
                  ) : messages.length === 0 ? (
                    /* Welcome Screen */
                    <div className="flex items-center justify-center h-full">
                      <div className="w-full">
                        <div className="text-center mb-6">
                          <h1 className="text-xl mb-2">How can I help you today?</h1>
                          <p className="text-gray-600 text-xs">
                            Ask questions to uncover market dynamics, prescribing trends, and data-driven insights to guide your brand strategy.
                          </p>
                        </div>
                        
                        {/* Suggestion Cards */}
                        <div className="grid grid-cols-1 gap-3 mb-6">
                          {suggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                if (!connected || isStreaming) return;
                                setQuery(suggestion);
                                // Send the query immediately
                                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                                  setIsStreaming(false);
                                  setIsWaitingForResponse(true);
                                  addMessage('query', suggestion);
                                  wsRef.current.send(JSON.stringify({ 
                                    query: suggestion,
                                    sessionId: sessionId.current 
                                  }));
                                  setQuery('');
                                }
                              }}
                              disabled={!connected || isStreaming}
                              className="bg-gray-50 border border-gray-200 p-4 hover:bg-gray-100 cursor-pointer transition-colors text-left rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <p className="text-sm">{suggestion}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Chat Messages */
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div key={message.id} className={`flex flex-col text-left w-full ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                          <div className="text-left w-full [&_*]:text-left">
                            <ChatMessage
                              {...message}
                              showTimeStamp={false}
                            />
                          </div>
                          {message.role === 'assistant' ? (
                            <button
                              onClick={() => copyToClipboard(message.content, message.id)}
                              className="mt-2 p-2 opacity-50 hover:opacity-100 hover:bg-gray-100 rounded transition-all"
                              title={copiedMessages.has(message.id) ? "Copied!" : "Copy message"}
                            >
                              {copiedMessages.has(message.id) ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                          ) : message.role === 'user' && (
                            <button
                              onClick={() => editMessage(message.content)}
                              className="mt-2 p-2 opacity-50 hover:opacity-100 hover:bg-gray-100 rounded transition-all"
                              title="Edit message"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      {isWaitingForResponse && (
                        <TypingIndicator />
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>
                
                {/* Fixed Input Area at Bottom */}
                <div className="border-t border-gray-200 pt-4 px-6 pb-4 bg-white">
                  <div className="w-full">
                    <form onSubmit={handleSubmit} className="relative">
                      <MessageInput
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Type your message here..."
                        disabled={!connected || isStreaming}
                        isGenerating={isStreaming}
                        submitOnEnter={true}
                        className="bg-gray-50 border border-gray-300"
                      />
                      {/* MessageInput has its own absolute positioned elements in the right corner */}
                      {/* We need to modify the positioning to place our cancel button next to the send button */}
                      <div className="absolute right-3 top-3 z-30 flex gap-2">
                        {/* Cancel button that appears during waiting or streaming */}
                        {(isWaitingForResponse || isStreaming) && (
                          <button
                            type="button"
                            onClick={cancelRequest}
                            className="h-8 w-8 bg-red-600 text-white rounded-md flex items-center justify-center hover:bg-red-700 transition-colors"
                            aria-label="Cancel request"
                            disabled={!connected}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                          </button>
                        )}
                      </div>
                    </form>
                    <p className="text-xs text-gray-500 text-center mt-2">
                      AI can make mistakes. Consider checking important information.
                    </p>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
          <div className="w-40"></div> {/* Empty div for spacing to keep Ask Starfire centered */}
        </div>
        
        {uploadError && (
          <div className="border-b border-gray-200 bg-white px-4 py-2">
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {uploadError}
            </div>
          </div>
        )}
        
        {/* Documents Table */}
        <div className="h-full flex flex-col">
          {/* Table Header */}
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5"></div>
              <h3 className="text-sm text-gray-700">Documents</h3>
              {selectedDocuments.size > 0 && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  {selectedDocuments.size} selected
                </span>
              )}
            </div>
          </div>
          
          {/* Horizontally Scrollable Table Container */}
          <div className="flex-1 overflow-hidden">
            <div className="flex h-full">
              {/* Fixed Row Numbers Column */}
              <div className="w-10 bg-gray-50 border-r border-gray-200 flex-shrink-0 z-10">
                <div className="h-8 bg-gray-50 border-b border-gray-200"></div>
                <div className="overflow-y-auto">
                  {(() => {
                    const rowNumbers: React.ReactNode[] = [];
                    let rowIndex = 1;
                    
                    // Add row numbers for uploading documents
                    uploadingDocuments.forEach((_, index) => {
                      rowNumbers.push(
                        <div key={`uploading-${index}`} className="h-12 flex items-center justify-center border-b border-gray-200 text-sm text-blue-600 bg-blue-50">
                          ↑
                        </div>
                      );
                      rowIndex++;
                    });
                    
                    if (isLoadingDocuments) {
                      Array.from({ length: 5 }, (_, index) => {
                        rowNumbers.push(
                          <div key={index} className="h-12 flex items-center justify-center border-b border-gray-200 text-sm text-gray-500">
                            {rowIndex + index}
                          </div>
                        );
                      });
                    } else if (documentsError) {
                      rowNumbers.push(
                        <div key="error" className="h-12 flex items-center justify-center border-b border-gray-200 text-sm text-gray-500">
                          !
                        </div>
                      );
                    } else if (documents.length > 0) {
                      documents.forEach((_, index) => {
                        rowNumbers.push(
                          <div key={index} className="h-12 flex items-center justify-center border-b border-gray-200 text-sm text-gray-500">
                            {rowIndex + index}
                          </div>
                        );
                      });
                    } else if (uploadingDocuments.length === 0) {
                      rowNumbers.push(
                        <div key="no-docs" className="h-12 flex items-center justify-center border-b border-gray-200 text-sm text-gray-500">
                          -
                        </div>
                      );
                    }
                    
                    return rowNumbers;
                  })()}
                </div>
              </div>
              
              {/* Horizontally Scrollable Resizable Columns Container */}
              <div className="flex-1 overflow-x-auto overflow-y-hidden">
                <div className="h-full" style={{ minWidth: '1200px' }}>
                  <ResizablePanelGroup direction="horizontal" className="h-full">
                    {/* Name Column */}
                    <ResizablePanel defaultSize={25} minSize={15} className="h-full flex flex-col border-r border-gray-200">
                      {/* Column Header */}
                      <div className="bg-gray-50 border-b border-gray-200 px-4 text-left text-sm text-gray-600 h-8 flex items-center justify-between">
                        <span>Name</span>
                        <button
                          onClick={() => handleSort('name')}
                          className="ml-2 hover:bg-gray-200 p-1 rounded"
                          title="Sort by name"
                        >
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </div>
                      {/* Column Content */}
                      <div className="flex-1 overflow-y-auto">
                        {renderColumnContent(
                          (doc) => (
                            <div className="flex items-center gap-2">
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
                                <LuExpand size={12} />
                              </button>
                              <span className="truncate font-medium block" title={String(doc.name || '')}>
                                {String(doc.name || '')}
                              </span>
                            </div>
                          ),
                          (uploadingDoc) => (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 flex-shrink-0"></div>
                              <div className="animate-spin text-blue-600 flex-shrink-0">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M21 12a9 9 0 11-6.219-8.56"/>
                                </svg>
                              </div>
                              <span className="truncate font-medium block text-blue-700" title={uploadingDoc.name}>
                                {uploadingDoc.name}
                              </span>
                              <span className="text-xs text-blue-600 ml-auto">Uploading...</span>
                            </div>
                          )
                        )}
                      </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* Type Column */}
                    <ResizablePanel defaultSize={10} minSize={8} className="h-full flex flex-col border-r border-gray-200">
                      {/* Column Header */}
                      <div className="bg-gray-50 border-b border-gray-200 px-4 text-left text-sm text-gray-600 h-8 flex items-center justify-between">
                        <span>Type</span>
                        <button
                          onClick={() => handleSort('type')}
                          className="ml-2 hover:bg-gray-200 p-1 rounded"
                          title="Sort by type"
                        >
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </div>
                      {/* Column Content */}
                      <div className="flex-1 overflow-y-auto">
                        {renderColumnContent(
                          (doc) => (
                            <span className="truncate block" title={String(doc.type || '')}>
                              {String(doc.type || '')}
                            </span>
                          ),
                          () => (
                            <div className="flex items-center">
                              <div className="animate-pulse bg-blue-200 h-3 w-16 rounded"></div>
                            </div>
                          )
                        )}
                      </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* Size Column */}
                    <ResizablePanel defaultSize={8} minSize={6} className="h-full flex flex-col border-r border-gray-200">
                      {/* Column Header */}
                      <div className="bg-gray-50 border-b border-gray-200 px-4 text-left text-sm text-gray-600 h-8 flex items-center justify-between">
                        <span>Size</span>
                        <button
                          onClick={() => handleSort('size')}
                          className="ml-2 hover:bg-gray-200 p-1 rounded"
                          title="Sort by size"
                        >
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </div>
                      {/* Column Content */}
                      <div className="flex-1 overflow-y-auto">
                        {renderColumnContent(
                          (doc) => (
                            <span className="truncate block" title={formatFileSize(Number(doc.size) || 0)}>
                              {formatFileSize(Number(doc.size) || 0)}
                            </span>
                          ),
                          (uploadingDoc) => (
                            <span className="truncate block text-blue-700" title={formatFileSize(uploadingDoc.size)}>
                              {formatFileSize(uploadingDoc.size)}
                            </span>
                          )
                        )}
                      </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* Summary Column */}
                    <ResizablePanel defaultSize={25} minSize={15} className="h-full flex flex-col border-r border-gray-200">
                      {/* Column Header */}
                      <div className="bg-gray-50 border-b border-gray-200 px-4 text-left text-sm text-gray-600 h-8 flex items-center justify-between">
                        <span>Summary</span>
                        <button
                          onClick={() => handleSort('summary')}
                          className="ml-2 hover:bg-gray-200 p-1 rounded"
                          title="Sort by summary"
                        >
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </div>
                      {/* Column Content */}
                      <div className="flex-1 overflow-y-auto">
                        {renderColumnContent(
                          (doc) => (
                            <span className="truncate block" title={String(doc.summary || '')}>
                              {String(doc.summary || '')}
                            </span>
                          ),
                          () => (
                            <div className="flex items-center">
                              <div className="animate-pulse bg-blue-200 h-3 w-24 rounded"></div>
                            </div>
                          )
                        )}
                      </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* Key Topics Column */}
                    <ResizablePanel defaultSize={15} minSize={12} className="h-full flex flex-col border-r border-gray-200">
                      {/* Column Header */}
                      <div className="bg-gray-50 border-b border-gray-200 px-4 text-left text-sm text-gray-600 h-8 flex items-center">
                        Key Topics
                      </div>
                      {/* Column Content */}
                      <div className="flex-1 overflow-y-auto">
                        {renderColumnContent(
                          (doc) => {
                            if (Array.isArray(doc.key_topics) && doc.key_topics.length > 0) {
                              const allTopicsText = doc.key_topics.join(', ');
                              return (
                                <div className="flex gap-1 overflow-x-auto scrollbar-hide" title={allTopicsText}>
                                  {doc.key_topics.map((topic, index) => {
                                    const colorIndex = (index % 12) + 1;
                                    return (
                                      <span
                                        key={index}
                                        className={`px-2 py-1 rounded-sm text-xs topic-color-${colorIndex} whitespace-nowrap flex-shrink-0`}
                                        title={topic}
                                      >
                                        {topic}
                                      </span>
                                    );
                                  })}
                                </div>
                              );
                            } else if (doc.key_topics && typeof doc.key_topics === 'string') {
                              const topicStr = doc.key_topics as string;
                              if (topicStr.trim()) {
                                return (
                                  <span className="px-2 py-1 rounded-sm text-xs topic-color-1" title={topicStr}>
                                    {topicStr}
                                  </span>
                                );
                              }
                            }
                            
                            return (
                              <span className="text-xs text-gray-500">
                                No topics
                              </span>
                            );
                          },
                          () => (
                            <div className="flex gap-1">
                              <div className="animate-pulse bg-blue-200 h-4 w-12 rounded-sm"></div>
                              <div className="animate-pulse bg-blue-200 h-4 w-8 rounded-sm"></div>
                            </div>
                          )
                        )}
                      </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* Classification Column */}
                    <ResizablePanel defaultSize={12} minSize={10} className="h-full flex flex-col border-r border-gray-200">
                      {/* Column Header */}
                      <div className="bg-gray-50 border-b border-gray-200 px-4 text-left text-sm text-gray-600 h-8 flex items-center justify-between">
                        <span>Classification</span>
                        <button
                          onClick={() => handleSort('data_classification')}
                          className="ml-2 hover:bg-gray-200 p-1 rounded"
                          title="Sort by classification"
                        >
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </div>
                      {/* Column Content */}
                      <div className="flex-1 overflow-y-auto">
                        {renderColumnContent(
                          (doc) => (
                            <span className="truncate block" title={String(doc.data_classification || '')}>
                              {String(doc.data_classification || '')}
                            </span>
                          ),
                          () => (
                            <div className="flex items-center">
                              <div className="animate-pulse bg-blue-200 h-3 w-20 rounded"></div>
                            </div>
                          )
                        )}
                      </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* Upload Date Column */}
                    <ResizablePanel defaultSize={10} minSize={8} className="h-full flex flex-col">
                      {/* Column Header */}
                      <div className="bg-gray-50 border-b border-gray-200 px-4 text-left text-sm text-gray-600 h-8 flex items-center justify-between">
                        <span>Upload Date</span>
                        <button
                          onClick={() => handleSort('upload_timestamp')}
                          className="ml-2 hover:bg-gray-200 p-1 rounded"
                          title="Sort by upload date"
                        >
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </div>
                      {/* Column Content */}
                      <div className="flex-1 overflow-y-auto">
                        {renderColumnContent(
                          (doc) => {
                            const dateText = formatDate(String(doc.upload_timestamp || ''));
                            return (
                              <span className="truncate block" title={dateText}>
                                {dateText}
                              </span>
                            );
                          },
                          () => (
                            <div className="flex items-center">
                              <div className="animate-pulse bg-blue-200 h-3 w-16 rounded"></div>
                            </div>
                          )
                        )}
                      </div>
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </div>
              </div>
            </div>
          </div>
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
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'var(--font-hanken)' }}>
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
            <div className="p-6 space-y-6" style={{ fontFamily: 'var(--font-hanken)' }}>
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
                    <div className="flex flex-wrap gap-2">
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
              
              {/* S3 Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">S3 Bucket</label>
                  <p className="text-base text-gray-900 bg-gray-50 p-3 rounded-md font-mono text-sm">
                    {selectedDocument.s3_bucket || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">S3 Key</label>
                  <p className="text-base text-gray-900 bg-gray-50 p-3 rounded-md font-mono text-sm">
                    {selectedDocument.s3_key || 'N/A'}
                  </p>
                </div>
              </div>
              
              {/* Content Type & Version */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Content Type</label>
                  <p className="text-base text-gray-900 bg-gray-50 p-3 rounded-md font-mono text-sm">
                    {selectedDocument.content_type || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Version</label>
                  <p className="text-base text-gray-900 bg-gray-50 p-3 rounded-md">
                    {selectedDocument.version || 'N/A'}
                  </p>
                </div>
              </div>
              
              {/* Last Modified */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Modified</label>
                <p className="text-base text-gray-900 bg-gray-50 p-3 rounded-md">
                  {formatDate(selectedDocument.last_modified || '')}
                </p>
              </div>
              
              {/* Document ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Document ID</label>
                <p className="text-base text-gray-900 bg-gray-50 p-3 rounded-md font-mono text-sm">
                  {selectedDocument.id || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Visualization Modal */}
      {isVisualizationModalOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closeVisualizationModal}
        >
          <div 
            className="bg-white rounded-lg shadow-xl w-[90vw] h-[90vh] max-w-6xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
              <h2 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'var(--font-hanken)' }}>
                Data Visualization
              </h2>
              <button 
                onClick={closeVisualizationModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6" style={{ fontFamily: 'var(--font-hanken)' }}>
              <DataVisualization />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatComponent;