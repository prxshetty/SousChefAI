"use client"

import React from "react"
import { PhoneOff, MessageCircle, Plus, ShoppingCart, Timer, Mic, MicOff, Loader2, Check, Trash2 } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { cn } from "@/lib/utils"

export interface VoiceControlsProps {
    isMuted: boolean
    showChatPanel: boolean
    showTimers: boolean
    showShoppingList: boolean
    timerCount: number
    shoppingCount: number
    fileCount: number
    isUploading: boolean
    isClearing: boolean
    uploadSuccess: boolean
    cookingMode: boolean
    onDisconnect: () => void
    onMuteToggle: () => void
    onChatToggle: () => void
    onTimersToggle: () => void
    onShoppingToggle: () => void
    onUploadClick: () => void
    onClear: () => void
    fileInputRef: React.RefObject<HTMLInputElement>
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function VoiceControls({
    isMuted,
    showChatPanel,
    showTimers,
    showShoppingList,
    timerCount,
    shoppingCount,
    fileCount,
    isUploading,
    isClearing,
    uploadSuccess,
    cookingMode,
    onDisconnect,
    onMuteToggle,
    onChatToggle,
    onTimersToggle,
    onShoppingToggle,
    onUploadClick,
    onClear,
    fileInputRef,
    onFileSelect,
}: VoiceControlsProps) {
    const showFileControls = !cookingMode

    return (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2">
            {/* End Call Button */}
            <button
                onClick={onDisconnect}
                className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                    "bg-background/50 backdrop-blur-sm border border-border/10",
                    "hover:scale-105 hover:border-red-500/50 hover:bg-red-500/10"
                )}
                title="End Call"
            >
                <PhoneOff className="size-4 text-red-500" />
            </button>

            {/* Chat Toggle */}
            <button
                onClick={onChatToggle}
                className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                    "backdrop-blur-sm border",
                    showChatPanel
                        ? "border-orange-500/50 bg-orange-500/10 text-orange-500"
                        : "bg-background/50 border-border/10 hover:scale-105 hover:border-border/30"
                )}
                title="Chat"
            >
                <MessageCircle className="size-4" />
            </button>

            {/* Upload Button */}
            {showFileControls && (
                <button
                    onClick={onUploadClick}
                    disabled={isUploading || isClearing}
                    className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-all relative",
                        "bg-background/50 backdrop-blur-sm border border-border/10",
                        "hover:scale-105 hover:border-border/30",
                        (isUploading || isClearing) && "opacity-50 cursor-not-allowed"
                    )}
                    title="Upload File"
                >
                    {isUploading ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : uploadSuccess ? (
                        <Check className="size-4" />
                    ) : (
                        <>
                            <Plus className="size-4" />
                            {fileCount > 0 && (
                                <span className="absolute -top-1 -right-1 text-[10px] bg-foreground text-background rounded-full size-4 flex items-center justify-center">
                                    {fileCount}
                                </span>
                            )}
                        </>
                    )}
                </button>
            )}

            {/* Clear Button */}
            {showFileControls && fileCount > 0 && (
                <button
                    onClick={onClear}
                    disabled={isClearing || isUploading}
                    className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                        "bg-background/50 backdrop-blur-sm border border-border/10",
                        "hover:scale-105 hover:border-red-500/50 hover:bg-red-500/10",
                        (isClearing || isUploading) && "opacity-50 cursor-not-allowed"
                    )}
                    title="Clear Files"
                >
                    {isClearing ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <Trash2 className="size-4 text-red-500" />
                    )}
                </button>
            )}

            {/* Shopping Cart Toggle */}
            <AnimatePresence>
                {shoppingCount > 0 && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={onShoppingToggle}
                        className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center transition-all relative",
                            "backdrop-blur-sm border",
                            showShoppingList
                                ? "border-orange-500/50 bg-orange-500/10 text-orange-500"
                                : "bg-background/50 border-border/10 hover:scale-105 hover:border-border/30"
                        )}
                        title="Shopping List"
                    >
                        <ShoppingCart className="size-4" />
                        <span className="absolute -top-1 -right-1 text-[10px] bg-orange-500 text-white rounded-full size-4 flex items-center justify-center font-medium">
                            {shoppingCount}
                        </span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Timer Toggle */}
            <AnimatePresence>
                {timerCount > 0 && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={onTimersToggle}
                        className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center transition-all relative",
                            "backdrop-blur-sm border",
                            showTimers
                                ? "border-orange-500/50 bg-orange-500/10 text-orange-500"
                                : "bg-background/50 border-border/10 hover:scale-105 hover:border-border/30"
                        )}
                        title="Timers"
                    >
                        <Timer className="size-4" />
                        <span className="absolute -top-1 -right-1 text-[10px] bg-orange-500 text-white rounded-full size-4 flex items-center justify-center font-medium">
                            {timerCount}
                        </span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Mute Toggle */}
            <button
                onClick={onMuteToggle}
                className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                    "bg-background/50 backdrop-blur-sm border",
                    isMuted
                        ? "border-orange-500/50 bg-orange-500/10"
                        : "border-border/10 hover:scale-105 hover:border-border/30"
                )}
                title={isMuted ? "Unmute" : "Mute"}
            >
                {isMuted ? <MicOff className="size-4 text-orange-500" /> : <Mic className="size-4" />}
            </button>

            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={onFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
            />
        </div>
    )
}
