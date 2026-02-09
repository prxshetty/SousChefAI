"use client"

import { X } from "lucide-react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"
import { ChatPanelProps } from "./types"

export function ChatPanel({ transcript, onClose }: ChatPanelProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-20 right-6 z-50 w-full max-w-[320px] origin-top-right"
        >
            <div className="h-full max-h-[400px] flex flex-col border rounded-3xl bg-card shadow-xl overflow-hidden">
                {/* Chat Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
                    <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/70">
                        Transcript
                    </span>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    >
                        <X className="size-3.5 text-muted-foreground" />
                    </button>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {transcript.length === 0 ? (
                        <p className="text-xs text-muted-foreground/40 text-center py-8">
                            Start speaking...
                        </p>
                    ) : (
                        transcript.map((entry) => (
                            <div
                                key={entry.id}
                                className={cn(
                                    "flex flex-col gap-0.5",
                                    entry.speaker === "user" ? "items-end" : "items-start"
                                )}
                            >
                                <p
                                    className={cn(
                                        "text-xs px-3 py-2 rounded-2xl max-w-[85%]",
                                        entry.speaker === "user"
                                            ? "bg-primary text-primary-foreground rounded-br-sm"
                                            : "bg-muted text-foreground rounded-bl-sm",
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
