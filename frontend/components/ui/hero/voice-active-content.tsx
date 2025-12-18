"use client"

import React, { useState, useEffect, useRef } from "react"
import { Plus, Check, Loader2, Mic, MicOff, MessageCircle, Trash2 } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import {
    useVoiceAssistant,
    RoomAudioRenderer,
    useConnectionState,
    useRoomContext,
    useMultibandTrackVolume,
} from "@livekit/components-react"
import { ConnectionState, RoomEvent, TranscriptionSegment, Participant, DataPacket_Kind } from "livekit-client"

import { cn } from "@/lib/utils"
import { VoiceActiveContentProps, TranscriptEntry, Timer } from "./types"
import { ChatPanel } from "./chat-panel"
import { TimerDisplay } from "./timer-display"

export function VoiceActiveContent({
    onUpload,
    onClear,
    isUploading,
    isProcessing,
    isClearing,
    uploadSuccess,
    fileCount,
    onDisconnect,
}: VoiceActiveContentProps) {
    const connectionState = useConnectionState()
    const { state: agentState, audioTrack: agentAudioTrack } = useVoiceAssistant()
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
    const [callDuration, setCallDuration] = useState(0)
    const [showChatPanel, setShowChatPanel] = useState(false)
    const [isMuted, setIsMuted] = useState(false)
    const [timers, setTimers] = useState<Timer[]>([])
    const [isHoveringDisconnect, setIsHoveringDisconnect] = useState(false)
    const room = useRoomContext()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const audioVolumes = useMultibandTrackVolume(agentAudioTrack, { bands: 12 })// Cooler UI 

    // Track call duration
    useEffect(() => {
        const interval = setInterval(() => {
            setCallDuration((d) => d + 1)
        }, 1000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        if (!room) return

        const handleDataReceived = (
            payload: Uint8Array,
            participant?: Participant,
            kind?: DataPacket_Kind
        ) => {
            try {
                const data = JSON.parse(new TextDecoder().decode(payload))

                if (data.type === "timer" && data.action === "start") {
                    console.log("Timer received:", data)
                    const newTimer: Timer = {
                        id: data.id,
                        label: data.label,
                        totalSeconds: data.seconds,
                        remainingSeconds: data.seconds,
                        startedAt: Date.now(),
                    }
                    setTimers((prev) => [...prev, newTimer])
                }
            } catch (e) {
            }
        }

        room.on(RoomEvent.DataReceived, handleDataReceived)
        return () => {
            room.off(RoomEvent.DataReceived, handleDataReceived)
        }
    }, [room])

    const handleRemoveTimer = (id: string) => {
        setTimers((prev) => prev.filter((t) => t.id !== id))
    }

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
        if (isClearing) return "Clearing cookbook..."
        if (isUploading) return "Uploading cookbook..."
        if (isProcessing) return "Processing cookbook..."
        if (uploadSuccess) return "Cookbook ready!"
        if (isConnecting) return "Connecting..."
        if (!isConnected) return "Disconnected"
        if (agentState === "listening") return "Listening..."
        if (agentState === "speaking") return "Speaking..."
        if (agentState === "thinking") return "Thinking..."
        return "Ready"
    }

    // Handle disconnect - ensure complete cleanup
    const handleMicClick = async () => {
        try {
            // Stop all local tracks first
            if (room) {
                const localParticipant = room.localParticipant

                // Unpublish and stop all tracks
                const publications = Array.from(localParticipant.trackPublications.values())
                for (const publication of publications) {
                    if (publication.track) {
                        publication.track.stop()
                        await localParticipant.unpublishTrack(publication.track)
                    }
                }

                // Disconnect from room
                await room.disconnect(true) // true = stop all tracks
            }
        } catch (error) {
            console.error("Error during disconnect:", error)
        } finally {
            // Always call parent disconnect callback
            onDisconnect()
        }
    }

    return (
        <>
            <RoomAudioRenderer />

            <div className={cn(
                "flex w-full h-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                showChatPanel ? "gap-8" : ""
            )}>

                {/* Main Voice Content (60% when chat open, 100% when closed) - CENTERED */}
                <motion.div
                    className="flex flex-col items-center justify-center gap-8"
                    layout
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    style={{ width: showChatPanel ? "60%" : "100%" }}
                >
                    {/* Timer Display */}
                    <TimerDisplay timers={timers} onRemoveTimer={handleRemoveTimer} />

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

                    {/* Voice Control + Chat + Upload Buttons - with glassmorphism */}
                    <motion.div
                        className="flex items-center gap-4"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        {/* LiveKit-aware Voice Control (click to disconnect) */}
                        <motion.button
                            onClick={handleMicClick}
                            onMouseEnter={() => setIsHoveringDisconnect(true)}
                            onMouseLeave={() => setIsHoveringDisconnect(false)}
                            className="flex p-3 border items-center justify-center rounded-full cursor-pointer hover:border-red-500 hover:bg-red-500/10 group transition-all bg-background/70 backdrop-blur-xl"
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
                                        {/* Frequency Animation - synced with real audio */}
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
                                        {/* Timer */}
                                        <div className="text-xs text-muted-foreground group-hover:text-red-500 w-10 text-center transition-colors">
                                            {formatTime(callDuration)}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.button>

                        {/* Mute Toggle Button */}
                        <button
                            onClick={async () => {
                                if (room) {
                                    const localParticipant = room.localParticipant
                                    const audioTracks = Array.from(localParticipant.audioTrackPublications.values())
                                    for (const pub of audioTracks) {
                                        if (pub.track) {
                                            if (isMuted) {
                                                await pub.track.unmute()
                                            } else {
                                                await pub.track.mute()
                                            }
                                        }
                                    }
                                    setIsMuted(!isMuted)
                                }
                            }}
                            className={cn(
                                "flex items-center justify-center p-3 border rounded-full transition-all duration-300 cursor-pointer bg-background/70 backdrop-blur-xl",
                                isMuted
                                    ? "border-orange-500 bg-orange-500/10 text-orange-500"
                                    : "hover:border-foreground hover:bg-foreground hover:text-background"
                            )}
                        >
                            {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
                        </button>

                        {/* Chat Toggle Button - with glassmorphism */}
                        <button
                            onClick={() => setShowChatPanel(!showChatPanel)}
                            className={cn(
                                "flex items-center justify-center p-3 border rounded-full transition-all duration-300 cursor-pointer bg-background/70 backdrop-blur-xl",
                                showChatPanel
                                    ? "border-foreground bg-foreground text-background"
                                    : "hover:border-foreground hover:bg-foreground hover:text-background"
                            )}
                        >
                            <MessageCircle className="size-5" />
                        </button>

                        {/* Upload Button - with glassmorphism */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading || isClearing}
                            className={cn(
                                "flex items-center justify-center p-3 border rounded-full transition-all duration-300 cursor-pointer bg-background/70 backdrop-blur-xl",
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

                        {/* Clear Button - only shows when files uploaded */}
                        {fileCount > 0 && (
                            <button
                                onClick={onClear}
                                disabled={isClearing || isUploading}
                                className={cn(
                                    "flex items-center justify-center p-3 border rounded-full transition-all duration-300 cursor-pointer bg-background/70 backdrop-blur-xl",
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

                {/* Chat History Panel (40% width when open) */}
                <AnimatePresence>
                    {showChatPanel && (
                        <ChatPanel
                            transcript={transcript}
                            onClose={() => setShowChatPanel(false)}
                        />
                    )}
                </AnimatePresence>
            </div>
        </>
    )
}
