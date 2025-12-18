"use client"

import { X } from "lucide-react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"
import { ChatPanelProps } from "./types"

export function ChatPanel({ transcript, onClose }: ChatPanelProps) {
    return (
        <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "40%" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
        >
            <div className="h-full max-h-[60vh] flex flex-col border rounded-2xl bg-background/70 backdrop-blur-xl">
                {/* Chat Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <span className="text-xs font-medium tracking-[0.3em] uppercase text-muted-foreground">
                        Conversation
                    </span>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-muted transition-colors"
                    >
                        <X className="size-4 text-muted-foreground" />
                    </button>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {transcript.length === 0 ? (
                        <p className="text-sm text-muted-foreground/50 text-center py-8">
                            Start speaking to see the conversation here...
                        </p>
                    ) : (
                        transcript.map((entry) => (
                            <div
                                key={entry.id}
                                className={cn(
                                    "flex flex-col gap-1",
                                    entry.speaker === "user" ? "items-end" : "items-start"
                                )}
                            >
                                <span className="text-[10px] font-medium tracking-widest uppercase text-muted-foreground">
                                    {entry.speaker === "user" ? "You" : "SousChef"}
                                </span>
                                <p
                                    className={cn(
                                        "text-sm max-w-[85%] px-3 py-2 rounded-2xl",
                                        entry.speaker === "user"
                                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                                            : "bg-muted text-foreground rounded-tl-sm",
                                        !entry.isFinal && "opacity-70"
                                    )}
                                >
                                    {entry.text}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </motion.div>
    )
}
