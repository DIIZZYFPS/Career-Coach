import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatFeed } from "@/components/chat/ChatFeed";
import { FileUpload } from "@/components/chat/FileUpload";
import { Bot, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import fetchStreamedResponse from "@/lib/Stream";


type Message = {
  id: string;
  content: string;
  sender: {
    name: string;
    type: "user" | "ai";
  };
  timestamp: Date;
};

const Index = () => {
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Ref to hold the current chat messages for the streaming callback
  const messagesRef = useRef(chatMessages);
  useEffect(() => {
    messagesRef.current = chatMessages;
  }, [chatMessages]);

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

    // Update state with the user message and the AI placeholder
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
      null // No file in a standard message
    );
    setIsLoading(false);
  };

  if (!hasStartedChat) {
    return <FileUpload onSubmit={handleFileUpload} />;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        
        {/* Header */}
        <Card className="mb-6 shadow-elegant animate-scale-in">
          <CardHeader className="bg-gradient-primary text-primary-foreground">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <div className="text-lg">Career Coach AI</div>
                <div className="text-sm opacity-90 font-normal">
                  Your personal guide to career success
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm opacity-90">Online</span>
              </div>
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Chat Interface */}
        <Card className="shadow-elegant animate-fade-in">
          <CardContent className="p-0">
            <ChatFeed 
              messages={chatMessages} 
              className="h-[calc(100vh-16rem)]"
            />
            
            {/* Input Area */}
            <div className="border-t bg-background/50 p-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="Ask a follow-up question..." 
                  className="flex-1 bg-background border-border"
                  value={userQuery}
                  onKeyUp={(e) => e.key === "Enter" && handleSendMessage()}
                  onChange={(e) => setUserQuery(e.target.value)}
                  disabled={isLoading}
                />
                <Button className="bg-gradient-primary hover:opacity-90 shrink-0" onClick={handleSendMessage} disabled={!userQuery.trim() || isLoading}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isLoading ? "Generating..." : "Send"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
      </div>
    </div>
  );
};

export default Index;