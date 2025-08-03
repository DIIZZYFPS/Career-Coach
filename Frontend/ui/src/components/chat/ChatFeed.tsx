import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./ChatMessage";

interface Message {
    id: string;
    content: string;
    sender: {
        name: string;
        type: "user" | "ai";
    };
    timestamp: Date;
}

interface ChatFeedProps {
    messages: Message[];
    className?: string;
}

export function ChatFeed({ messages, className }: ChatFeedProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <ScrollArea className={className} ref={scrollRef}>
            <div className="divide-y divide-border">
                {messages
                    .slice()
                    .reverse()
                    .map((message) => (
                        <ChatMessage key={message.id} {...message} />
                    ))}
            </div>
        </ScrollArea>
    );
}