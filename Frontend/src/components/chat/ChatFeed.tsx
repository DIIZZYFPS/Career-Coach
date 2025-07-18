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

export function ChatFeed( { messages, className }: ChatFeedProps) {
    return (
        <ScrollArea className={className}>
            <div className="divide-y divide-border">
                {messages.map((message) => (
                    <ChatMessage key={message.id} {...message} />
                )).reverse()}
            </div>
        </ScrollArea>

    )
}