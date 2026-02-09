"use client"

import React from "react"
import { Plus, Check, Loader2, Mic, MicOff, MessageCircle, Trash2, Timer, ShoppingCart, PhoneOff } from "lucide-react"
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
    showTimers,
    showShoppingList,
    timerCount,
    shoppingCount,
    isUploading,
    isClearing,
    uploadSuccess,
    fileCount,
    isHoveringDisconnect,
    cookingMode,
    onDisconnect,
    onMuteToggle,
    onChatToggle,
    onTimersToggle,
    onShoppingToggle,
    onUploadClick,
    onClear,
    onHoverDisconnect,
    fileInputRef,
    onFileSelect,
}: VoiceControlBarProps) {
    // Don't show upload/clear buttons during cooking mode
    const showFileControls = !cookingMode
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
                    {isHoveringDisconnect ? (
                        <PhoneOff className="size-5 text-red-500" />
                    ) : agentState === "thinking" ? (
                        <motion.div
                            className="w-4 h-4 bg-primary rounded"
                            animate={{ rotate: [0, 180, 360] }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                        />
                    ) : null}
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

            {/* Timer Toggle Button */}
            <AnimatePresence>
                {timerCount > 0 && (
                    <motion.button
                        key="timer-button"
                        initial={{ opacity: 0, scale: 0.8, width: 0, marginRight: 0 }}
                        animate={{ opacity: 1, scale: 1, width: "auto", marginRight: 0 }}
                        exit={{ opacity: 0, scale: 0.8, width: 0, marginRight: 0 }}
                        onClick={onTimersToggle}
                        className={cn(
                            "flex items-center justify-center p-3 border rounded-full transition-all duration-300 cursor-pointer bg-background/50 relative",
                            showTimers
                                ? "border-foreground bg-foreground text-background"
                                : "hover:border-foreground hover:bg-foreground hover:text-background"
                        )}
                    >
                        <Timer className="size-5" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Shopping List Toggle Button */}
            <AnimatePresence>
                {shoppingCount > 0 && (
                    <motion.button
                        key="shopping-button"
                        initial={{ opacity: 0, scale: 0.8, width: 0, marginRight: 0 }}
                        animate={{ opacity: 1, scale: 1, width: "auto", marginRight: 0 }}
                        exit={{ opacity: 0, scale: 0.8, width: 0, marginRight: 0 }}
                        onClick={onShoppingToggle}
                        className={cn(
                            "flex items-center justify-center p-3 border rounded-full transition-all duration-300 cursor-pointer bg-background/50 relative",
                            showShoppingList
                                ? "border-foreground bg-foreground text-background"
                                : "hover:border-foreground hover:bg-foreground hover:text-background"
                        )}
                    >
                        <ShoppingCart className="size-5" />
                        <span className={cn(
                            "absolute -top-1 -right-1 text-[10px] rounded-full size-4 flex items-center justify-center transition-colors",
                            showShoppingList ? "bg-background text-foreground" : "bg-foreground text-background"
                        )}>
                            {shoppingCount}
                        </span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Upload Button - Hidden during cooking */}
            {showFileControls && (
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
            )}

            {/* Clear Button - Hidden during cooking */}
            {showFileControls && fileCount > 0 && (
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
