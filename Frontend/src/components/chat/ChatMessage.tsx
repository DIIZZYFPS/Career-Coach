import { Avatar, AvatarFallback} from "@/components/ui/avatar"
import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";



interface ChatMessageProps {
    id: string;
    content: string;
    sender: {
        name: string;
        type: "user" | "ai";
    };
    timestamp: Date;
}

export function ChatMessage({
    content,
    sender,
    timestamp
}: ChatMessageProps) {
    const isUser = sender.type === "user";

    return (
        <div className={cn(
            "flex gap-4 py-6 px-4 animate-fade-in",
            isUser? "bg-background" : "bg-muted/30"
        )}>
            <Avatar className="h-8 w-8 shrink-0 mt-1">
                {isUser ? (
                    <AvatarFallback className="bg-primary text-primary-foreground">
                        <User className="h-4 w-4" />
                    </AvatarFallback>
                ) : (
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                        <Bot className="h-4 w-4" />
                    </AvatarFallback>
                )}
            </Avatar>

            <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                    <span className="textsm font-semibold text-foreground">
                        {sender.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(timestamp, {addSuffix: true })}
                    </span>
                </div>

                <div className={cn(
                    "prose prose-sm max-w-none",
                    "text-foreground leading-relaxed",
                    isUser && "font-medium"
                )} style={{ whiteSpace: "pre-wrap" }}>
                    {content.split('\n').map((paragraph, index) => (
                        <p key={index} className={cn(
                            "mb-3 last:mb-0",
                            isUser ? "text-foreground" : "text-foreground/90"
                        )}>
                            {isUser
                                ? paragraph
                                : paragraph.split(/(\s+)/).map((part, i) =>
                                    part.trim() === ""
                                        ? part // preserve whitespace as-is
                                        : (
                                            <span
                                                key={i}
                                                className="blur-in"
                                            >
                                                {part}
                                            </span>
                                        )
                                )
                            }
                        </p>
                    ))}
                </div>
            </div>
        </div>
    )
}