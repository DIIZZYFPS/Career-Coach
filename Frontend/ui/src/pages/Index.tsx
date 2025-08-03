import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";
import fetchStreamedResponse from "@/lib/Stream";
import { FileUpload } from "@/components/chat/FileUpload";

// Extend Window interface for TypeScript
declare global {
  interface Window {
    electronAPI?: {
      onUpdateLoading: (callback: (event: any, message: string) => void) => void;
      onHideLoading: (callback: (event: any) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}

interface Message {
  id: string;
  content: string;
  sender: { name: string; type: "user" | "ai" };
  timestamp: Date;
}

const Index = () => {
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Backend loading state
  const [showBackendLoading, setShowBackendLoading] = useState(true); // Start as true
  const [backendLoadingMessage, setBackendLoadingMessage] = useState("Initializing...");

  // Ref to hold the current chat messages for the streaming callback
  const messagesRef = useRef(chatMessages);
  useEffect(() => {
    messagesRef.current = chatMessages;
  }, [chatMessages]);

  // Listen for Electron IPC messages
  useEffect(() => {
    if (window.electronAPI) {
      console.log("Setting up Electron API listeners...");
      
      // Listen for loading updates
      window.electronAPI.onUpdateLoading((event, message) => {
        console.log("Received loading update:", message);
        setBackendLoadingMessage(message);
        setShowBackendLoading(true);
      });

      // Listen for hide loading
      window.electronAPI.onHideLoading((event) => {
        console.log("Received hide loading signal");
        setShowBackendLoading(false);
      });
    } else {
      console.log("Electron API not available - running in browser mode");
      // If not in Electron, hide loading after a short delay
      setTimeout(() => {
        setShowBackendLoading(false);
      }, 1000);
    }

    // Cleanup listeners on unmount
    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('update-loading');
        window.electronAPI.removeAllListeners('hide-loading');
      }
    };
  }, []);

  const handleFileUpload = async (file: File, description: string) => {
    setIsLoading(true);
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: `Analyze the following resume against the job description.\n\n${description}`,
      sender: { name: "You", type: "user" },
      timestamp: new Date(),
    };

    const aiPlaceholder: Message = {
      id: `ai-${Date.now() + 1}`,
      content: "",
      sender: { name: "AI Assistant", type: "ai" },
      timestamp: new Date(),
    };

    const newMessages = [aiPlaceholder, userMessage, ...chatMessages];
    setChatMessages(newMessages);
    setHasStartedChat(true);

    await fetchStreamedResponse(
      newMessages,
      (token) => {
        setChatMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiPlaceholder.id
              ? { ...msg, content: msg.content + token }
              : msg
          )
        );
      },
      file
    );
    setIsLoading(false);
  };

  const handleSendMessage = async () => {
    if (!userQuery.trim() || isLoading) return;
    setIsLoading(true);

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: userQuery,
      sender: { name: "You", type: "user" },
      timestamp: new Date(),
    };

    const aiPlaceholder: Message = {
      id: `ai-${Date.now() + 1}`,
      content: "",
      sender: { name: "AI Assistant", type: "ai" },
      timestamp: new Date(),
    };

    const newMessages = [aiPlaceholder, userMessage, ...chatMessages];
    setChatMessages(newMessages);
    setUserQuery("");

    await fetchStreamedResponse(
      newMessages,
      (token) => {
        setChatMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiPlaceholder.id
              ? { ...msg, content: msg.content + token }
              : msg
          )
        );
      },
      null
    );
    setIsLoading(false);
  };

  // Show loading screen while backend is starting
  if (showBackendLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto"></div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Career Coach</h2>
            <p className="text-lg font-medium">{backendLoadingMessage}</p>
            <p className="text-sm text-muted-foreground">Please wait while we prepare your AI assistant...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show file upload screen if chat hasn't started
  if (!hasStartedChat) {
    return <FileUpload onSubmit={handleFileUpload} />;
  }

  // Show chat interface
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <Card className="mb-6 shadow-elegant animate-scale-in">
          <CardHeader className="bg-gradient-primary text-secondary-foreground">
            <CardTitle className="text-center text-xl font-bold">
              Career Coach - AI Assistant
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Chat Messages */}
        <Card className="mb-4 shadow-elegant">
          <CardContent className="p-0">
            <ScrollArea className="h-[400px] p-4">
              <div className="space-y-4">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender.type === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`flex items-start space-x-3 max-w-[80%] ${
                        message.sender.type === "user" ? "flex-row-reverse space-x-reverse" : ""
                      }`}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {message.sender.type === "user" ? "U" : "AI"}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`rounded-lg p-3 ${
                          message.sender.type === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Input Area */}
        <Card className="shadow-elegant">
          <CardContent className="p-4">
            <div className="flex space-x-2">
              <Textarea
                placeholder="Ask me anything about your career..."
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                className="flex-1 min-h-[60px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!userQuery.trim() || isLoading}
                size="lg"
                className="h-[60px] px-6"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;