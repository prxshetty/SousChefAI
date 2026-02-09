"use client"

import React, { useState, useEffect, useRef } from "react"
import { ArrowUpRight, Plus, Check, Loader2, Mic, MessageSquare, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import {
    LiveKitRoom,
    useVoiceAssistant,
    RoomAudioRenderer,
    useConnectionState,
    useRoomContext,
} from "@livekit/components-react"
import { ConnectionState, RoomEvent, TranscriptionSegment, Participant } from "livekit-client"

import { cn } from "@/lib/utils"

import { VoiceActiveContent } from "./VoiceActiveContent"
import { VoiceSelectView } from "@/components/landing/VoiceSelect"

// Types
interface TranscriptEntry {
    id: string
    speaker: "user" | "agent"
    text: string
    timestamp: Date
    isFinal: boolean
}

type ViewState = "hero" | "voice-select" | "voice-active"

interface HeroSectionProps {
    livekitUrl: string
}



// Main Hero Section Component
export function HeroSection({ livekitUrl }: HeroSectionProps) {
    const [viewState, setViewState] = useState<ViewState>("hero")
    const [isHovered, setIsHovered] = useState(false)
    const [isClicked, setIsClicked] = useState(false)
    const [selectedVoice, setSelectedVoice] = useState<"male" | "female" | null>(null)
    const [token, setToken] = useState<string>("")
    const [room, setRoom] = useState<string>("")
    const [setupStarted, setSetupStarted] = useState(false)

    // Upload state
    const [uploadedFiles, setUploadedFiles] = useState<number>(0)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadSuccess, setUploadSuccess] = useState(false)

    // Handle arrow click - transition to voice selection
    const handleArrowClick = (e: React.MouseEvent) => {
        e.preventDefault()
        setIsClicked(true)
        setTimeout(() => {
            setSetupStarted(true)
            setIsClicked(false) // Reset for the next button
        }, 600)
    }

    // Handle voice selection
    const handleVoiceSelect = async (voice: "male" | "female", apiKey?: string) => {
        setSelectedVoice(voice)

        // Get token and connect
        try {
            let url = `/api/token?voice=${voice}`
            if (apiKey) {
                url += `&apiKey=${encodeURIComponent(apiKey)}`
            }
            const response = await fetch(url)
            const data = await response.json()

            if (data.error) {
                console.error("Token error:", data.error)
                return
            }

            setToken(data.token)
            setRoom(data.room)
            setViewState("voice-active")
        } catch (error) {
            console.error("Failed to connect:", error)
        }
    }

    // Handle file upload
    const handleUpload = async (file: File) => {
        if (!file.name.endsWith(".pdf")) {
            alert("Please upload a PDF file")
            return
        }

        setIsUploading(true)
        setUploadSuccess(false)

        try {
            const formData = new FormData()
            formData.append("file", file)

            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            })

            const data = await response.json()

            if (data.error) {
                console.error("Upload failed:", data.error)
                return
            }

            // Show success state
            setUploadSuccess(true)
            setUploadedFiles((prev) => prev + 1)

            // Reset success state after 2 seconds
            setTimeout(() => {
                setUploadSuccess(false)
            }, 2000)
        } catch (error) {
            console.error("Upload error:", error)
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <section className={cn(
            "relative flex min-h-screen items-center justify-center overflow-hidden",
            viewState !== "voice-active" && "px-6"
        )}>


            <div className={cn(
                "relative flex flex-col items-center z-10",
                viewState === "voice-active" ? "w-full h-full" : "gap-12"
            )}>

                {/* ============ HERO VIEW ============ */}
                {viewState === "hero" && (
                    <motion.div
                        className="flex flex-col items-center w-full max-w-4xl"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {/* Status indicator - Only on landing */}
                        {!setupStarted && (
                            <motion.div
                                className="flex items-center gap-3 mb-8"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{
                                    opacity: isClicked ? 0 : 1,
                                    y: isClicked ? -20 : 0
                                }}
                                transition={{ duration: 0.5 }}
                            >
                                <span className="relative flex size-2">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                                </span>
                                <span className="text-sm font-medium tracking-widest uppercase text-muted-foreground">
                                    Ready to cook
                                </span>
                            </motion.div>
                        )}

                        {/* Hero Title */}
                        <div className="flex flex-col items-center gap-6">
                            <h2 className="relative text-center text-5xl font-light tracking-tight text-foreground sm:text-6xl md:text-7xl lg:text-8xl">
                                <span className="block overflow-hidden">
                                    <motion.span
                                        className="block"
                                        animate={{
                                            y: setupStarted ? -20 : isHovered && !isClicked ? "-8%" : "0%",
                                            scale: setupStarted ? 0.8 : 1,
                                            opacity: setupStarted ? 0.6 : 1
                                        }}
                                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                    >
                                        SousChef AI
                                    </motion.span>
                                </span>
                                {!setupStarted && (
                                    <span className="block overflow-hidden">
                                        <motion.span
                                            className="block text-muted-foreground/60 text-xl sm:text-2xl md:text-3xl font-light tracking-wide"
                                            animate={{ y: isHovered && !isClicked ? "-8%" : "0%" }}
                                            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.075 }}
                                        >
                                            talk to cook
                                        </motion.span>
                                    </span>
                                )}
                            </h2>

                            <AnimatePresence mode="wait">
                                {!setupStarted ? (
                                    <motion.div
                                        key="landing-arrow"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                                        className="group relative cursor-pointer mt-4"
                                        onMouseEnter={() => setIsHovered(true)}
                                        onMouseLeave={() => setIsHovered(false)}
                                        onClick={handleArrowClick}
                                    >
                                        {/* Arrow Button */}
                                        <div className="relative flex size-16 items-center justify-center sm:size-20">
                                            <motion.div
                                                className="pointer-events-none absolute inset-0 rounded-full border"
                                                animate={{
                                                    borderColor: isClicked ? "var(--foreground)" : isHovered ? "var(--foreground)" : "var(--border)",
                                                    backgroundColor: isClicked ? "transparent" : isHovered ? "var(--foreground)" : "transparent",
                                                    scale: isClicked ? 3 : isHovered ? 1.1 : 1,
                                                    opacity: isClicked ? 0 : 1,
                                                }}
                                                transition={{ duration: isClicked ? 0.7 : 0.5 }}
                                            />
                                            <motion.div
                                                animate={{
                                                    x: isClicked ? 100 : isHovered ? 2 : 0,
                                                    y: isClicked ? -100 : isHovered ? -2 : 0,
                                                    scale: isClicked ? 0.5 : 1,
                                                    opacity: isClicked ? 0 : 1,
                                                }}
                                                transition={{ duration: isClicked ? 0.6 : 0.5 }}
                                            >
                                                <ArrowUpRight
                                                    className="size-6 sm:size-7"
                                                    style={{ color: isHovered && !isClicked ? "var(--background)" : "var(--foreground)" }}
                                                />
                                            </motion.div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="setup-view"
                                        initial={{ opacity: 0, y: 40 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                        className="w-full flex justify-center"
                                    >
                                        <VoiceSelectView
                                            onVoiceSelect={handleVoiceSelect}
                                            onBack={() => setSetupStarted(false)}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* GitHub Link - Only on landing */}
                        {!setupStarted && (
                            <motion.div
                                className="mt-8 flex flex-col items-center gap-4 text-center"
                                animate={{
                                    opacity: isClicked ? 0 : 1,
                                    y: isClicked ? 20 : 0,
                                }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                            >
                                <a
                                    href="https://github.com/prxshetty/SousChefAI"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <svg className="size-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                    </svg>
                                    <span className="text-sm font-medium">View on GitHub</span>
                                </a>
                            </motion.div>
                        )}
                    </motion.div>
                )}



                {/* ============ VOICE ACTIVE VIEW ============ */}
                {viewState === "voice-active" && token && livekitUrl && (
                    <LiveKitRoom
                        token={token}
                        serverUrl={livekitUrl}
                        connect={true}
                        audio={true}
                        video={false}
                        onDisconnected={() => {
                            setViewState("hero")
                            setToken("")
                            setSelectedVoice(null)
                            setIsClicked(false)
                        }}
                        className="w-full h-full"
                    >
                        <VoiceActiveContent
                            onUpload={handleUpload}
                            isUploading={isUploading}
                            uploadSuccess={uploadSuccess}
                            fileCount={uploadedFiles}
                            onDisconnect={() => {
                                setViewState("hero")
                                setToken("")
                                setSelectedVoice(null)
                                setIsClicked(false)
                            }}
                            onClear={async () => {
                                // TODO: Implement clearing logic
                                setUploadedFiles(0)
                            }}
                            isClearing={false}
                            isProcessing={false}
                        />
                    </LiveKitRoom>
                )}
            </div>
        </section >
    )
}
