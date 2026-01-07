"use client"

import React from "react"
import { Plus, Check, Loader2, Mic, MicOff, MessageCircle, Trash2 } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { cn } from "@/lib/utils"
import { VoiceControlBarProps } from "./types"

export function VoiceControlBar({
    isConnected,
    isActive,
    agentState,
    isMuted,
    audioVolumes,
    showChatPanel,
    isUploading,
    isClearing,
    uploadSuccess,
    fileCount,
    isHoveringDisconnect,
    onDisconnect,
    onMuteToggle,
    onChatToggle,
    onUploadClick,
    onClear,
    onHoverDisconnect,
    fileInputRef,
    onFileSelect,
}: VoiceControlBarProps) {
    return (
        <motion.div
            className={cn(
                "flex items-center gap-4 transition-all duration-500",
                "fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-background/80 backdrop-blur-md p-3 px-6 rounded-full shadow-lg border border-border/50"
            )}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
        >
            {/* LiveKit-aware Voice Control (click to disconnect) */}
            <motion.button
                onClick={onDisconnect}
                onMouseEnter={() => onHoverDisconnect(true)}
                onMouseLeave={() => onHoverDisconnect(false)}
                className="flex p-3 border items-center justify-center rounded-full cursor-pointer hover:border-red-500 hover:bg-red-500/10 group transition-all bg-background/50"
                layout
                transition={{ layout: { duration: 0.4 } }}
            >
                <div className="h-6 w-6 items-center justify-center flex">
                    {isActive ? (
                        <motion.div
                            className="w-4 h-4 bg-primary rounded group-hover:bg-red-500 transition-colors"
                            animate={{ rotate: isHoveringDisconnect ? 0 : [0, 180, 360] }}
                            transition={{
                                duration: isHoveringDisconnect ? 0.3 : 2,
                                repeat: isHoveringDisconnect ? 0 : Infinity,
                                ease: "easeInOut",
                            }}
                        />
                    ) : agentState === "thinking" ? (
                        <Loader2 className="size-5 animate-spin group-hover:text-red-500 transition-colors" />
                    ) : (
                        <div className="w-4 h-4 bg-primary group-hover:bg-red-500 rounded-full transition-colors" />
                    )}
                </div>
                <AnimatePresence mode="wait">
                    {isConnected && (
                        <motion.div
                            initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                            animate={{ opacity: 1, width: "auto", marginLeft: 8 }}
                            exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                            transition={{ duration: 0.4 }}
                            className="overflow-hidden flex gap-2 items-center justify-center"
                        >
                            {/* Frequency Animation */}
                            <div className="flex gap-0.5 items-center justify-center">
                                {audioVolumes.map((vol, i) => (
                                    <div
                                        key={i}
                                        className="w-0.5 bg-primary group-hover:bg-red-500 rounded-full transition-colors"
                                        style={{
                                            height: `${Math.max(2, 2 + vol * 14)}px`,
                                            transition: 'height 0.05s ease-out',
                                        }}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>

            {/* Mute Toggle Button */}
            <button
                onClick={onMuteToggle}
                className={cn(
                    "flex items-center justify-center p-3 border rounded-full transition-all duration-300 cursor-pointer bg-background/50",
                    isMuted
                        ? "border-orange-500 bg-orange-500/10 text-orange-500"
                        : "hover:border-foreground hover:bg-foreground hover:text-background"
                )}
            >
                {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
            </button>

            {/* Chat Toggle Button */}
            <button
                onClick={onChatToggle}
                className={cn(
                    "flex items-center justify-center p-3 border rounded-full transition-all duration-300 cursor-pointer bg-background/50",
                    showChatPanel
                        ? "border-foreground bg-foreground text-background"
                        : "hover:border-foreground hover:bg-foreground hover:text-background"
                )}
            >
                <MessageCircle className="size-5" />
            </button>

            {/* Upload Button */}
            <button
                onClick={onUploadClick}
                disabled={isUploading || isClearing}
                className={cn(
                    "flex items-center justify-center p-3 border rounded-full transition-all duration-300 cursor-pointer bg-background/50",
                    "hover:border-foreground hover:bg-foreground hover:text-background",
                    (isUploading || isClearing) && "opacity-50 cursor-not-allowed"
                )}
            >
                {isUploading ? (
                    <Loader2 className="size-5 animate-spin" />
                ) : uploadSuccess ? (
                    <Check className="size-5" />
                ) : (
                    <div className="relative">
                        <Plus className="size-5" />
                        {fileCount > 0 && (
                            <span className="absolute -top-2 -right-2 text-[10px] bg-foreground text-background rounded-full size-4 flex items-center justify-center">
                                {fileCount}
                            </span>
                        )}
                    </div>
                )}
            </button>

            {/* Clear Button */}
            {fileCount > 0 && (
                <button
                    onClick={onClear}
                    disabled={isClearing || isUploading}
                    className={cn(
                        "flex items-center justify-center p-3 border rounded-full transition-all duration-300 cursor-pointer bg-background/50",
                        "hover:border-red-500 hover:bg-red-500/10 hover:text-red-500",
                        (isClearing || isUploading) && "opacity-50 cursor-not-allowed"
                    )}
                >
                    {isClearing ? (
                        <Loader2 className="size-5 animate-spin" />
                    ) : (
                        <Trash2 className="size-5" />
                    )}
                </button>
            )}

            <input
                type="file"
                ref={fileInputRef as React.RefObject<HTMLInputElement>}
                onChange={onFileSelect}
                accept=".pdf"
                className="hidden"
            />
        </motion.div>
    )
}
