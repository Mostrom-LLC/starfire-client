import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChatMessage, type Message } from '../ui/chat-message';
import { MessageInput } from '../ui/message-input';
import { TypingIndicator } from '../ui/typing-indicator';
import { Copy, Check, Pencil, RefreshCw, Search, MessageSquare, Plus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface InternalMessage {
  type: 'query' | 'chunk' | 'response' | 'error' | 'system';
  content: string;
  isComplete?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  date: string;
  preview: string;
  isActive?: boolean;
}


// API Functions for Chat History Management
const fetchChatHistory = async (): Promise<ChatSession[]> => {
  // For now, return mock data. In a real app, this would be an API call
  return [
    {
      id: 'chat-1',
      title: 'Market Analysis for Drug X',
      date: '2025-07-10',
      preview: 'Analysis of market trends for Drug X across different regions...',
    },
    {
      id: 'chat-2',
      title: 'Competitive Landscape Review',
      date: '2025-07-09',
      preview: 'Overview of key competitors in the oncology space...',
    },
    {
      id: 'chat-3',
      title: 'Prescriber Behavior Analysis',
      date: '2025-07-08',
      preview: 'Patterns in prescriber behavior for cardiovascular medications...',
    },
    {
      id: 'chat-4',
      title: 'Formulary Coverage Report',
      date: '2025-07-07',
      preview: 'Analysis of formulary coverage changes in Q2 2025...',
    },
    {
      id: 'chat-5',
      title: 'Patient Adherence Insights',
      date: '2025-07-06',
      preview: 'Factors affecting patient adherence to treatment regimens...',
    },
  ];
};

const createChatSession = async (title?: string): Promise<ChatSession> => {
  // In a real app, this would make an API call to create a new chat session
  const newChat: ChatSession = {
    id: `chat-${Math.random().toString(36).substring(2, 9)}`,
    title: title || `New Conversation ${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    preview: 'Start a new conversation...',
  };
  return newChat;
};

/* const updateChatSession = async (id: string, updates: Partial<ChatSession>): Promise<ChatSession> => {
  // In a real app, this would make an API call to update the chat session
  return { id, ...updates } as ChatSession;
};

const deleteChatSession = async (id: string): Promise<void> => {
  // In a real app, this would make an API call to delete the chat session
  console.log('Deleting chat session:', id);
}; */

export function Chat() {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const [chatMessages, setChatMessages] = useState<InternalMessage[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const sessionId = useRef(`session-${Math.random().toString(36).substring(2, 11)}`);
  const [copiedMessages, setCopiedMessages] = useState<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const currentResponseIndexRef = useRef<number>(-1);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // TanStack Query for chat history
  const { data: chatHistory = [], isLoading: isLoadingChats, error: chatError } = useQuery({
    queryKey: ['chat-history'],
    queryFn: fetchChatHistory,
  });

  // Create chat session mutation
  const createChatMutation = useMutation({
    mutationFn: createChatSession,
    onSuccess: (newChat) => {
      queryClient.setQueryData(['chat-history'], (old: ChatSession[] = []) => [
        newChat,
        ...old.map(chat => ({ ...chat, isActive: false }))
      ]);
      setActiveChatId(newChat.id);
    },
    onError: (error) => {
      console.error('Error creating chat session:', error);
    },
  });


  // Example suggestions for new users
  const suggestions = [
    "Which drugs in our portfolio show unusual shifts in utilization by state or plan coverage?",
    "Are there prescribing trends that signal emerging competitive threats or formulary changes?",
    "Which high-cost drugs have the greatest impact on overall plan spending and should be prioritized for deeper analysis?",
    "How does recent formulary tiering impact patient adherence and fill rates in key regions?",
    "Which prescribers are driving the highest volume of non-preferred drug utilization?"
  ];

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

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    // Determine the WebSocket protocol based on the page protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // Use environment variable if available, otherwise construct URL with appropriate protocol
    let wsUrl = import.meta.env.VITE_WEB_SOCKET_URL;
    
    if (!wsUrl) {
      // Extract host from environment or use default
      const wsHost = import.meta.env.VITE_API_HOST || 'localhost:8000';
      wsUrl = `${protocol}//${wsHost}/ws/query`;
    } else if (wsUrl.startsWith('ws://') && protocol === 'wss:') {
      // If we have a hardcoded ws:// URL but we're on https, upgrade to wss://
      wsUrl = wsUrl.replace('ws://', 'wss://');
    }
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      setConnected(true);
      addMessage('system', 'Connected to WebSocket');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
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
      
      // Otherwise, create a new response message
      const newMessage = { type: 'chunk' as const, content: chunk, isComplete: false };
      currentResponseIndexRef.current = prev.length;
      return [...prev, newMessage];
    });
  };

  const completeCurrentResponse = () => {
    setChatMessages(prev => {
      if (currentResponseIndexRef.current >= 0 && currentResponseIndexRef.current < prev.length) {
        const newMessages = [...prev];
        const currentMessage = newMessages[currentResponseIndexRef.current];
        
        if (currentMessage) {
          newMessages[currentResponseIndexRef.current] = {
            ...currentMessage,
            type: 'response',
            isComplete: true
          };
        }
        
        // Reset the current response index
        currentResponseIndexRef.current = -1;
        return newMessages;
      }
      return prev;
    });
  };

  const cancelRequest = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ 
        cancel: true,
        sessionId: sessionId.current 
      }));
      
      // Update UI state immediately without waiting for server confirmation
      setIsStreaming(false);
      setIsWaitingForResponse(false);
      
      // Complete the current response if there is one
      completeCurrentResponse();
      
      // Add a system message indicating cancellation
      addMessage('system', '--- Request cancelled by user ---');
    }
  };

  const handleNewSession = () => {
    // Generate a new session ID
    sessionId.current = `session-${Math.random().toString(36).substring(2, 11)}`;
    
    // Clear chat messages
    setChatMessages([]);
    
    // Add a system message indicating new session
    addMessage('system', '--- New Session Started ---');
  };

  const copyToClipboard = (text: string, messageId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMessages(prev => {
        const newSet = new Set(prev);
        newSet.add(messageId);
        return newSet;
      });
      
      // Remove the "Copied!" indicator after 2 seconds
      setTimeout(() => {
        setCopiedMessages(prev => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          return newSet;
        });
      }, 2000);
    });
  };

  const editMessage = (text: string) => {
    setQuery(text);
  };

  // Function to select a chat session
  const selectChatSession = (id: string) => {
    setActiveChatId(id);
    // In a real app, this would load the selected chat session's messages
    // For now, we'll just mark it as active in the UI
  };

  // Function to create a new chat session
  const createNewChatSession = () => {
    const title = `New Conversation ${chatHistory.length + 1}`;
    createChatMutation.mutate(title);
  };

  // Filter chat history based on search query
  const filteredChatHistory = searchQuery
    ? chatHistory.filter(chat => 
        chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.preview.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : chatHistory;

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Chat History Sidebar */}
      <div className={cn(
        "absolute left-0 top-0 z-10 border-r border-gray-200 flex flex-col h-full overflow-hidden transition-all duration-200 bg-white",
        sidebarOpen ? "w-72 translate-x-0" : "w-72 -translate-x-full"
      )}>
        <div className="p-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium truncate">Chat History</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 ml-1"
              onClick={createNewChatSession}
              disabled={createChatMutation.isPending}
              title="New Chat"
            >
              {createChatMutation.isPending ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-900"></div>
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="relative w-full">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search conversations..."
              className="pl-8 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <ScrollArea className="flex-1 overflow-y-auto h-full w-full">
          <div className="p-2 space-y-1 w-full">
            {isLoadingChats ? (
              <div className="text-center py-8 text-gray-500 text-sm px-2 w-full overflow-hidden">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto mb-2"></div>
                <p>Loading conversations...</p>
              </div>
            ) : chatError ? (
              <div className="text-center py-8 text-red-500 text-sm px-2 w-full overflow-hidden">
                <p className="truncate">Error loading conversations</p>
              </div>
            ) : filteredChatHistory.length > 0 ? (
              filteredChatHistory.map((chat) => (
                <button
                  key={chat.id}
                  className={cn(
                    "w-full text-left p-3 rounded-md hover:bg-gray-100 transition-colors border",
                    activeChatId === chat.id 
                      ? "bg-gray-100 border-gray-300" 
                      : "border-transparent"
                  )}
                  onClick={() => selectChatSession(chat.id)}
                  disabled={createChatMutation.isPending}
                >
                  <div className="flex items-start gap-2 w-full">
                    <MessageSquare className="h-4 w-4 mt-0.5 text-gray-500 shrink-0" />
                    <div className="flex-1 min-w-0 overflow-hidden max-w-[200px]">
                      <div className="font-medium text-sm truncate max-w-full">{chat.title}</div>
                      <div className="text-xs text-gray-500 truncate max-w-full">{chat.preview}</div>
                      <div className="text-xs text-gray-400 mt-1 flex items-center max-w-full">
                        <Clock className="h-3 w-3 mr-1 shrink-0" />
                        <span className="truncate max-w-[160px]">{chat.date}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm px-2 w-full overflow-hidden">
                <p className="truncate">
                  {searchQuery ? "No matching conversations" : "No conversations yet"}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
      
      {/* Main Chat Area */}
      <div className={cn(
        "flex flex-col h-full w-full overflow-hidden transition-all duration-200",
        sidebarOpen ? "pl-72" : "pl-0"
      )}>
        {/* Header with controls */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="mr-2 h-8 w-8"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? "Hide chat history" : "Show chat history"}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-medium">Chat Assistant</h2>
          </div>
          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  title="Start new chat"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>New Chat</span>
                </Button>
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
          </div>
        </div>
        
        {/* Chat Messages Area - Scrollable */}
        <div className="flex-1 overflow-y-auto px-4 min-h-0 pb-2 w-full">
          {!connected ? (
            /* Warming up loader */
            <div className="flex items-center justify-center h-full w-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p className="text-gray-600 text-sm">Warming up...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            /* Welcome Screen */
            <div className="flex items-center justify-center h-full w-full">
              <div className="w-full max-w-lg mx-auto">
                <div className="text-center mb-6">
                  <h1 className="text-xl mb-2">How can I help you today?</h1>
                  <p className="text-gray-600 text-sm">
                    Ask questions to uncover market dynamics, prescribing trends, and data-driven insights.
                  </p>
                </div>
                
                {/* Suggestion Cards */}
                <div className="grid grid-cols-1 gap-3 mb-6">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        if (!connected || isStreaming) return;
                        // Send the query immediately
                        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                          setIsStreaming(false);
                          setIsWaitingForResponse(true);
                          addMessage('query', suggestion);
                          wsRef.current.send(JSON.stringify({ 
                            query: suggestion,
                            sessionId: sessionId.current 
                          }));
                          // Clear the input field after sending
                          setQuery('');
                        }
                      }}
                      className="p-3 border border-gray-200 rounded-lg text-left hover:bg-gray-50 transition-colors"
                      disabled={!connected || isStreaming}
                    >
                      <p className="text-sm">{suggestion}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
          /* Chat Messages */
          <div className="space-y-4 py-4 max-w-full overflow-hidden">
            {messages.map((message) => (
              <div key={message.id} className="w-full overflow-hidden">
                <div className="w-full overflow-hidden">
                  <ChatMessage
                    {...message}
                    showTimeStamp={false}
                  />
                </div>
                <div className="flex justify-end">
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
        <div className="pt-2 px-4 pb-4 shrink-0 flex justify-center">
        <div className="w-full max-w-2xl">
          <form onSubmit={(e) => {
            e.preventDefault();
            sendQuery();
          }} className="relative w-full">
            <MessageInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type your message here..."
              disabled={!connected || isStreaming}
              isGenerating={isStreaming}
              submitOnEnter={true}
              className="w-full"
            />
            {/* Cancel button that appears during waiting or streaming */}
            <div className="absolute right-3 top-3 z-30 flex gap-2">
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
          <p className="text-xs text-gray-500 text-center mt-2 w-full overflow-hidden">
            <span className="inline-block max-w-full truncate">AI can make mistakes. Consider checking important information.</span>
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}