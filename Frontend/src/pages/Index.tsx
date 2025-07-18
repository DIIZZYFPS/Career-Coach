import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatFeed } from "@/components/chat/ChatFeed";
import { FileUpload } from "@/components/chat/FileUpload";
import { mockMessages } from "@/data/mockMessages";
import { Bot, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
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

  const handleFileUpload = async (file: File, description: string) => {
    const userMessage = {
      id: "upload-1",
      content: `I've uploaded a file: ${file.name}\n\n${description}`,
      sender: {
        name: "You",
        type: "user" as const,
      },
      timestamp: new Date(),
    };

    
    setHasStartedChat(true);
    // Add the user message immediately
    setChatMessages((prev) => [userMessage, ...prev]);
    setUserQuery("");

    // Prepare a placeholder for the streaming AI message
    const aiMessageId = `ai-${Date.now() + 1}`;
    let aiContent = "";

    setChatMessages((prev) => [
      {
        id: aiMessageId,
        content: "",
        sender: { name: "AI Assistant", type: "ai" },
        timestamp: new Date(),
      },
      ...prev,
    ]);

    // Stream the response and update the AI message as tokens arrive
    await fetchStreamedResponse(
      userMessage.content,
      userMessage.content,
      (token) => {
        aiContent += token;
        setChatMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMessageId
              ? { ...msg, content: aiContent }
              : msg
          )
        );
      },
      file
    );
  };

  const handleSendMessage = async () => {
    if (!userQuery.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: userQuery,
      sender: { name: "You", type: "user" },
      timestamp: new Date(),
    };

    // Add the user message immediately
    setChatMessages((prev) => [userMessage, ...prev]);
    setUserQuery("");

    // Prepare a placeholder for the streaming AI message
    const aiMessageId = `ai-${Date.now() + 1}`;
    let aiContent = "";

    setChatMessages((prev) => [
      {
        id: aiMessageId,
        content: "",
        sender: { name: "AI Assistant", type: "ai" },
        timestamp: new Date(),
      },
      ...prev,
    ]);

    // Stream the response and update the AI message as tokens arrive
    await fetchStreamedResponse(
      userMessage.content,
      userMessage.content,
      (token) => {
        aiContent += token;
        setChatMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMessageId
              ? { ...msg, content: aiContent }
              : msg
          )
        );
      },
      null // No file provided in this context
    );
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
                <div className="text-lg">AI Assistant</div>
                <div className="text-sm opacity-90 font-normal">
                  Ask me anything about React, development, or programming
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
                  placeholder="Ask me anything..." 
                  className="flex-1 bg-background border-border"
                  value={userQuery}
                  onKeyUp={(e) => e.key === "Enter" && handleSendMessage()}
                  onKeyDown={(e) => e.key === "Enter" && e.shiftKey && e.preventDefault()}
                  onChange={(e) => setUserQuery(e.target.value)}
                />
                <Button className="bg-gradient-primary hover:opacity-90 shrink-0" onClick={handleSendMessage} disabled={!userQuery.trim()}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Send
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