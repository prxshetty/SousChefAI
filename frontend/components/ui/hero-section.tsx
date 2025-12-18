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
import { Particles } from "@/components/bg-particle"

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

// Voice Active Content Component (inside LiveKitRoom)
function VoiceActiveContent({
    onUpload,
    isUploading,
    uploadSuccess,
    fileCount,
    onDisconnect,
}: {
    onUpload: (file: File) => Promise<void>
    isUploading: boolean
    uploadSuccess: boolean
    fileCount: number
    onDisconnect: () => void
}) {
    const connectionState = useConnectionState()
    const { state: agentState } = useVoiceAssistant()
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
    const [callDuration, setCallDuration] = useState(0)
    const [showChatPanel, setShowChatPanel] = useState(false)
    const room = useRoomContext()
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Track call duration
    useEffect(() => {
        const interval = setInterval(() => {
            setCallDuration((d) => d + 1)
        }, 1000)
        return () => clearInterval(interval)
    }, [])

    // Subscribe to transcription events
    useEffect(() => {
        if (!room) return

        const handleTranscription = (
            segments: TranscriptionSegment[],
            participant?: Participant
        ) => {
            segments.forEach((segment) => {
                const isAgent = participant?.identity !== room.localParticipant.identity
                const speaker = isAgent ? "agent" : "user"

                setTranscript((prev) => {
                    const existingIndex = prev.findIndex((t) => t.id === segment.id)

                    if (existingIndex >= 0) {
                        const updated = [...prev]
                        updated[existingIndex] = {
                            ...updated[existingIndex],
                            text: segment.text,
                            isFinal: segment.final,
                        }
                        return updated
                    } else {
                        return [
                            ...prev,
                            {
                                id: segment.id,
                                speaker,
                                text: segment.text,
                                timestamp: new Date(),
                                isFinal: segment.final,
                            },
                        ]
                    }
                })
            })
        }

        room.on(RoomEvent.TranscriptionReceived, handleTranscription)
        return () => {
            room.off(RoomEvent.TranscriptionReceived, handleTranscription)
        }
    }, [room])

    const isConnected = connectionState === ConnectionState.Connected
    const isConnecting = connectionState === ConnectionState.Connecting
    const isActive = agentState === "listening" || agentState === "speaking"

    // Get current and previous transcript
    const currentTranscript = transcript[transcript.length - 1]
    const previousTranscript = transcript[transcript.length - 2]

    // Handle file selection
    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            await onUpload(file)
        }
    }

    // Format duration
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }

    // Determine status text
    const getStatusText = () => {
        if (isUploading) return "Uploading cookbook..."
        if (uploadSuccess) return "Cookbook ready!"
        if (isConnecting) return "Connecting..."
        if (!isConnected) return "Disconnected"
        if (agentState === "listening") return "Listening..."
        if (agentState === "speaking") return "Speaking..."
        if (agentState === "thinking") return "Thinking..."
        return "Ready"
    }

    // Handle disconnect
    const handleMicClick = () => {
        room?.disconnect()
        onDisconnect()
    }

    return (
        <>
            <RoomAudioRenderer />

            <div className={cn(
                "flex w-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                showChatPanel ? "gap-8" : ""
            )}>

                {/* Main Voice Content (60% when chat open, 100% when closed) */}
                <motion.div
                    className="flex flex-col items-center gap-8"
                    layout
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    style={{ width: showChatPanel ? "60%" : "100%" }}
                >
                    {/* Previous transcript (smaller, faded) */}
                    <motion.div
                        className="flex flex-col items-center gap-2 min-h-[60px]"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        {previousTranscript && (
                            <>
                                <span className="text-xs font-medium tracking-[0.3em] uppercase text-muted-foreground">
                                    {previousTranscript.speaker === "user" ? "You" : "SousChef"}
                                </span>
                                <p className="text-sm text-muted-foreground/70 max-w-md text-center truncate">
                                    {previousTranscript.text}
                                </p>
                            </>
                        )}
                    </motion.div>

                    {/* Current transcript (larger, prominent) */}
                    <motion.h3
                        className="text-2xl sm:text-3xl font-light tracking-tight text-foreground text-center max-w-lg min-h-[80px] flex items-center justify-center"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        {currentTranscript?.text || "Start speaking..."}
                    </motion.h3>

                    {/* Voice Control + Chat + Upload Buttons */}
                    <motion.div
                        className="flex items-center gap-4"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        {/* LiveKit-aware Voice Control (click to disconnect) */}
                        <motion.button
                            onClick={handleMicClick}
                            className="flex p-3 border items-center justify-center rounded-full cursor-pointer hover:border-red-500 hover:bg-red-500/10 group transition-all"
                            layout
                            transition={{ layout: { duration: 0.4 } }}
                        >
                            <div className="h-6 w-6 items-center justify-center flex">
                                {isActive ? (
                                    <motion.div
                                        className="w-4 h-4 bg-primary group-hover:bg-red-500 rounded-sm transition-colors"
                                        animate={{ rotate: [0, 180, 360] }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            ease: "easeInOut",
                                        }}
                                    />
                                ) : (
                                    <Mic className="size-5 group-hover:text-red-500 transition-colors" />
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
                                        {/* Frequency Animation - synced with agent state */}
                                        <div className="flex gap-0.5 items-center justify-center">
                                            {[...Array(12)].map((_, i) => (
                                                <motion.div
                                                    key={i}
                                                    className="w-0.5 bg-primary group-hover:bg-red-500 rounded-full transition-colors"
                                                    initial={{ height: 2 }}
                                                    animate={{
                                                        height: isActive
                                                            ? [2, 3 + Math.random() * 10, 3 + Math.random() * 5, 2]
                                                            : 2,
                                                    }}
                                                    transition={{
                                                        duration: isActive ? 1 : 0.3,
                                                        repeat: isActive ? Infinity : 0,
                                                        delay: isActive ? i * 0.05 : 0,
                                                        ease: "easeInOut",
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        {/* Timer */}
                                        <div className="text-xs text-muted-foreground group-hover:text-red-500 w-10 text-center transition-colors">
                                            {formatTime(callDuration)}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.button>

                        {/* Chat Toggle Button */}
                        <button
                            onClick={() => setShowChatPanel(!showChatPanel)}
                            className={cn(
                                "flex items-center justify-center p-3 border rounded-full transition-all duration-300 cursor-pointer",
                                showChatPanel
                                    ? "border-foreground bg-foreground text-background"
                                    : "hover:border-foreground hover:bg-foreground hover:text-background"
                            )}
                        >
                            <MessageSquare className="size-5" />
                        </button>

                        {/* Upload Button (Plus icon, on the RIGHT) */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className={cn(
                                "flex items-center justify-center p-3 border rounded-full transition-all duration-300 cursor-pointer",
                                "hover:border-foreground hover:bg-foreground hover:text-background",
                                isUploading && "opacity-50 cursor-not-allowed"
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
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept=".pdf"
                            className="hidden"
                        />
                    </motion.div>

                    {/* Status Text */}
                    <motion.span
                        className="text-xs font-medium tracking-[0.3em] uppercase text-muted-foreground"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                    >
                        {getStatusText()}
                    </motion.span>
                </motion.div>

                {/* Chat History Panel (40% width when open) - NOW ON THE RIGHT */}
                <AnimatePresence>
                    {showChatPanel && (
                        <motion.div
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "40%" }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden"
                        >
                            <div className="h-screen flex flex-col border rounded-2xl bg-background/50 backdrop-blur-sm">
                                {/* Chat Header */}
                                <div className="flex items-center justify-between p-4 border-b">
                                    <span className="text-xs font-medium tracking-[0.3em] uppercase text-muted-foreground">
                                        Conversation
                                    </span>
                                    <button
                                        onClick={() => setShowChatPanel(false)}
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
                    )}
                </AnimatePresence>
            </div>
        </>
    )
}

// Main Hero Section Component
export function HeroSection({ livekitUrl }: HeroSectionProps) {
    const [viewState, setViewState] = useState<ViewState>("hero")
    const [isHovered, setIsHovered] = useState(false)
    const [isClicked, setIsClicked] = useState(false)
    const [selectedVoice, setSelectedVoice] = useState<"male" | "female" | null>(null)
    const [token, setToken] = useState<string>("")
    const [room, setRoom] = useState<string>("")

    // Upload state
    const [uploadedFiles, setUploadedFiles] = useState<number>(0)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadSuccess, setUploadSuccess] = useState(false)

    // Handle arrow click - transition to voice selection
    const handleArrowClick = (e: React.MouseEvent) => {
        e.preventDefault()
        setIsClicked(true)
        setTimeout(() => {
            setViewState("voice-select")
        }, 500)
    }

    // Handle voice selection
    const handleVoiceSelect = async (voice: "male" | "female") => {
        setSelectedVoice(voice)

        // Get token and connect
        try {
            const response = await fetch(`/api/token?voice=${voice}`)
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
        <section className="relative flex min-h-screen items-center justify-center px-6 overflow-hidden">
            {/* Background Particles */}
            <Particles
                className="absolute inset-0"
                quantity={30}
                staticity={50}
                ease={50}
                color="#ffffff"
                minSize={1}
                maxSize={8}
            />

            <div className="relative flex flex-col items-center gap-12 z-10">

                {/* ============ HERO VIEW ============ */}
                {viewState === "hero" && (
                    <>
                        {/* Status indicator */}
                        <motion.div
                            className="flex items-center gap-3"
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

                        {/* Hero Title */}
                        <motion.div
                            className="group relative cursor-pointer"
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                            onClick={handleArrowClick}
                            animate={{
                                opacity: isClicked ? 0 : 1,
                                y: isClicked ? -40 : 0,
                                scale: isClicked ? 0.95 : 1,
                            }}
                            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <div className="flex flex-col items-center gap-6">
                                <h2 className="relative text-center text-5xl font-light tracking-tight text-foreground sm:text-6xl md:text-7xl lg:text-8xl">
                                    <span className="block overflow-hidden">
                                        <motion.span
                                            className="block"
                                            animate={{ y: isHovered && !isClicked ? "-8%" : "0%" }}
                                            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                                        >
                                            SousChef AI
                                        </motion.span>
                                    </span>
                                    <span className="block overflow-hidden">
                                        <motion.span
                                            className="block text-muted-foreground/60 text-xl sm:text-2xl md:text-3xl font-light tracking-wide"
                                            animate={{ y: isHovered && !isClicked ? "-8%" : "0%" }}
                                            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.075 }}
                                        >
                                            talk to cook
                                        </motion.span>
                                    </span>
                                </h2>

                                {/* Arrow Button */}
                                <div className="relative mt-4 flex size-16 items-center justify-center sm:size-20">
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
                            </div>

                            {/* Decorative lines */}
                            <div className="absolute -left-8 top-1/2 -translate-y-1/2 sm:-left-16">
                                <motion.div
                                    className="h-px w-8 bg-border sm:w-12"
                                    animate={{
                                        scaleX: isClicked ? 0 : isHovered ? 1.5 : 1,
                                        x: isClicked ? -20 : 0,
                                        opacity: isClicked ? 0 : isHovered ? 1 : 0.5,
                                    }}
                                    transition={{ duration: 0.5 }}
                                />
                            </div>
                            <div className="absolute -right-8 top-1/2 -translate-y-1/2 sm:-right-16">
                                <motion.div
                                    className="h-px w-8 bg-border sm:w-12"
                                    animate={{
                                        scaleX: isClicked ? 0 : isHovered ? 1.5 : 1,
                                        x: isClicked ? 20 : 0,
                                        opacity: isClicked ? 0 : isHovered ? 1 : 0.5,
                                    }}
                                    transition={{ duration: 0.5 }}
                                />
                            </div>
                        </motion.div>

                        {/* GitHub Link */}
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
                    </>
                )}

                {/* ============ VOICE SELECTION VIEW ============ */}
                {viewState === "voice-select" && (
                    <motion.div
                        className="flex flex-col items-center gap-8"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <span className="text-xs font-medium tracking-[0.3em] uppercase text-muted-foreground">
                            Select a voice
                        </span>

                        <div className="flex gap-8">
                            {/* Female Voice */}
                            <motion.button
                                onClick={() => handleVoiceSelect("female")}
                                className="flex flex-col items-center gap-3 group cursor-pointer"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.1, duration: 0.4 }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <div className="relative w-24 h-24 rounded-full border-2 overflow-hidden transition-all duration-300 group-hover:border-foreground">
                                    <img
                                        src="/female-chef.png"
                                        alt="Female chef"
                                        className="absolute inset-0 w-full h-full object-cover"
                                    />
                                </div>
                                <span className="text-sm font-medium tracking-widest uppercase text-muted-foreground group-hover:text-foreground transition-colors">
                                    Female
                                </span>
                            </motion.button>

                            {/* Male Voice */}
                            <motion.button
                                onClick={() => handleVoiceSelect("male")}
                                className="flex flex-col items-center gap-3 group cursor-pointer"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.2, duration: 0.4 }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <div className="relative w-24 h-24 rounded-full border-2 overflow-hidden transition-all duration-300 group-hover:border-foreground">
                                    <img
                                        src="/male-chef.png"
                                        alt="Male chef"
                                        className="absolute inset-0 w-full h-full object-cover"
                                    />
                                </div>
                                <span className="text-sm font-medium tracking-widest uppercase text-muted-foreground group-hover:text-foreground transition-colors">
                                    Male
                                </span>
                            </motion.button>
                        </div>
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
                        />
                    </LiveKitRoom>
                )}
            </div>
        </section>
    )
}
