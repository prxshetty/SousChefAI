"use client"

import React, { useState, useEffect, useRef } from "react"
import { AnimatePresence, motion } from "motion/react"
import {
    useVoiceAssistant,
    RoomAudioRenderer,
    useConnectionState,
    useRoomContext,
    useMultibandTrackVolume,
    useLocalParticipant,
} from "@livekit/components-react"
import { ConnectionState, RoomEvent, TranscriptionSegment, Participant, DataPacket_Kind, Track, LocalAudioTrack } from "livekit-client"

import { cn } from "@/lib/utils"
import { VoiceActiveContentProps, TranscriptEntry, Timer, ShoppingItem, RecipePlan } from "./types"
import { ChatPanel } from "./ChatPanel"
import { TimerDisplay } from "@/components/tools/TimerDisplay"
import { ShoppingList } from "@/components/tools/ShoppingList"
import { CookingView } from "@/components/cooking/CookingView"
import { VoiceControls } from "./VoiceControls"
import { TranscriptFooter } from "./TranscriptFooter"

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
    const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([])
    const [recipePlan, setRecipePlan] = useState<RecipePlan | null>(null)
    const [isRecipeGenerating, setIsRecipeGenerating] = useState(false)
    const [cookingMode, setCookingMode] = useState(false)
    const [showTimers, setShowTimers] = useState(false)
    const [showShoppingList, setShowShoppingList] = useState(false)
    const [isHoveringDisconnect, setIsHoveringDisconnect] = useState(false)
    const room = useRoomContext()
    const { localParticipant } = useLocalParticipant()
    const localAudioTrack = localParticipant?.getTrackPublication(Track.Source.Microphone)?.track as LocalAudioTrack | undefined
    const fileInputRef = useRef<HTMLInputElement>(null)
    const agentVolumes = useMultibandTrackVolume(agentAudioTrack, { bands: 12 })
    const userVolumes = useMultibandTrackVolume(localAudioTrack, { bands: 12 })

    // Merge volumes - show whichever is active (simple max for now)
    const audioVolumes = agentVolumes.map((agentVol, i) => Math.max(agentVol, (userVolumes[i] || 0) * 3))

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

                if (data.type === "timer") {
                    if (data.action === "start") {
                        console.log("Timer received:", data)
                        const newTimer: Timer = {
                            id: data.id,
                            label: data.label,
                            totalSeconds: data.seconds,
                            remainingSeconds: data.seconds,
                            startedAt: Date.now(),
                        }
                        setTimers((prev) => [...prev, newTimer])
                    } else if (data.action === "clear_all") {
                        console.log("Clearing all timers")
                        setTimers([])
                    }
                }

                if (data.type === "shopping_list") {
                    console.log("Shopping list update:", data)
                    if (data.action === "update") {
                        setShoppingList(data.items || [])
                    } else if (data.action === "clear") {
                        setShoppingList([])
                    }
                }

                if (data.type === "recipe_plan") {
                    console.log("Recipe plan received:", data.plan)
                    setRecipePlan(data.plan)
                    setIsRecipeGenerating(false)
                    // We don't auto-start cooking mode; wait for "cooking_mode" event
                }

                if (data.type === "recipe_plan_status") {
                    if (data.action === "started") {
                        setIsRecipeGenerating(true)
                    }
                }

                if (data.type === "cooking_mode") {
                    if (data.action === "start") {
                        setCookingMode(true)
                        setIsRecipeGenerating(false)
                    } else if (data.action === "complete") {
                        // Optional: show completion celebration, then maybe exit mode after delay?
                        // For now just stay on last step or let user decide to leave.
                    }
                }

                if (data.type === "step_update") {
                    // Always update using the setter function to avoid stale closure
                    setRecipePlan(prev => prev ? ({
                        ...prev,
                        current_step_index: data.step_index
                    }) : null)
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

    const handleRemoveShoppingItem = (id: string) => {
        setShoppingList((prev) => prev.filter((item) => item.id !== id))
    }

    const handleUpdateShoppingQuantity = (id: string, quantity: number) => {
        if (quantity <= 0) {
            // Remove item if quantity goes to 0
            handleRemoveShoppingItem(id)
        } else {
            setShoppingList((prev) =>
                prev.map((item) =>
                    item.id === id ? { ...item, quantity } : item
                )
            )
        }
    }

    const handleClearShoppingList = () => {
        setShoppingList([])
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

    // Handlers for Cooking View - send navigation requests to agent
    const handleNextStep = async () => {
        if (!room || !recipePlan) return

        // Update local state optimistically
        const nextIdx = recipePlan.current_step_index + 1
        if (nextIdx < recipePlan.steps.length) {
            setRecipePlan(prev => prev ? ({
                ...prev,
                current_step_index: nextIdx
            }) : null)

            // Send step update to agent for sync
            const payload = JSON.stringify({
                type: "ui_step_change",
                action: "next",
                step_index: nextIdx
            })
            await room.localParticipant.publishData(
                new TextEncoder().encode(payload),
                { reliable: true }
            )
        }
    }

    const handlePrevStep = async () => {
        if (!room || !recipePlan) return

        // Update local state optimistically
        const prevIdx = recipePlan.current_step_index - 1
        if (prevIdx >= 0) {
            setRecipePlan(prev => prev ? ({
                ...prev,
                current_step_index: prevIdx
            }) : null)

            // Send step update to agent for sync
            const payload = JSON.stringify({
                type: "ui_step_change",
                action: "previous",
                step_index: prevIdx
            })
            await room.localParticipant.publishData(
                new TextEncoder().encode(payload),
                { reliable: true }
            )
        }
    }

    // Handle mute toggle
    const handleMuteToggle = async () => {
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
    }

    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
            <RoomAudioRenderer />

            {/* Shopping List - Fixed bottom-left (toggleable) */}
            <AnimatePresence>
                {showShoppingList && shoppingList.length > 0 && (
                    <ShoppingList
                        items={shoppingList}
                        onRemoveItem={handleRemoveShoppingItem}
                        onUpdateQuantity={handleUpdateShoppingQuantity}
                        onClearAll={handleClearShoppingList}
                    />
                )}
            </AnimatePresence>

            {/* Timers - Toggleable via Control Bar, only show if timers exist */}
            <AnimatePresence>
                {showTimers && timers.length > 0 && (
                    <TimerDisplay timers={timers} onRemoveTimer={handleRemoveTimer} />
                )}
            </AnimatePresence>

            {/* Transcript moved to footer */}

            {/* Main Content Area */}
            <div className="w-full h-full flex flex-col items-center justify-center relative">
                {cookingMode && recipePlan ? (
                    <CookingView
                        recipe={recipePlan}
                        onNext={handleNextStep}
                        onPrev={handlePrevStep}
                        onComplete={() => setCookingMode(false)}
                    />
                ) : (
                    // Standard State - largely empty now as transcript is floated top
                    <div className="flex-1 flex items-center justify-center">
                        {/* Central area is now clean, status stays in footer */}
                    </div>
                )}
            </div>

            {/* Voice Controls - Top Right */}
            <VoiceControls
                isMuted={isMuted}
                showChatPanel={showChatPanel}
                showTimers={showTimers}
                showShoppingList={showShoppingList}
                timerCount={timers.length}
                shoppingCount={shoppingList.length}
                fileCount={fileCount}
                isUploading={isUploading}
                isClearing={isClearing}
                uploadSuccess={uploadSuccess}
                cookingMode={cookingMode}
                onDisconnect={handleMicClick}
                onMuteToggle={handleMuteToggle}
                onChatToggle={() => setShowChatPanel(!showChatPanel)}
                onTimersToggle={() => setShowTimers(!showTimers)}
                onShoppingToggle={() => setShowShoppingList(!showShoppingList)}
                onUploadClick={() => fileInputRef.current?.click()}
                onClear={onClear}
                fileInputRef={fileInputRef}
                onFileSelect={handleFileSelect}
            />


            {/* Transcript Footer - Bottom */}
            <TranscriptFooter
                transcript={currentTranscript?.text || null}
                agentState={agentState}
                audioVolumes={audioVolumes}
                isVisible={!cookingMode}
            />

            {/* Chat History Panel (Floating Overlay) */}
            <AnimatePresence>
                {showChatPanel && (
                    <ChatPanel
                        transcript={transcript}
                        onClose={() => setShowChatPanel(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}
