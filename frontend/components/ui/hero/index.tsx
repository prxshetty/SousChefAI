"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import { LiveKitRoom, useRoomContext } from "@livekit/components-react"
import { Room, RemoteParticipant, ParticipantKind } from "livekit-client"

import { Particles } from "@/components/bg-particle"
import { ViewState, HeroSectionProps } from "./types"
import { HeroView } from "./hero-view"
import { VoiceSelectView } from "./voice-select-view"
import { VoiceActiveContent } from "./voice-active-content"

export function HeroSection({ livekitUrl }: HeroSectionProps) {
    const [viewState, setViewState] = useState<ViewState>("hero")
    const [isHovered, setIsHovered] = useState(false)
    const [isClicked, setIsClicked] = useState(false)
    const [selectedVoice, setSelectedVoice] = useState<"male" | "female" | null>(null)
    const [token, setToken] = useState<string>("")
    const [room, setRoom] = useState<string>("")

    // Room reference for RPC calls
    const roomRef = useRef<Room | null>(null)

    // Upload state
    const [uploadedFiles, setUploadedFiles] = useState<number>(0)
    const [isUploading, setIsUploading] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [isClearing, setIsClearing] = useState(false)
    const [uploadSuccess, setUploadSuccess] = useState(false)

    // Handle arrow click - transition to voice selection
    const handleArrowClick = (e: React.MouseEvent) => {
        e.preventDefault()
        setIsClicked(true)
        setTimeout(() => {
            setViewState("voice-select")
        }, 500)
    }

    // Handle back button
    const handleBack = () => {
        setViewState("hero")
        setIsClicked(false)
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

    // Find agent participant in the room
    const findAgentParticipant = useCallback((): RemoteParticipant | null => {
        if (!roomRef.current) return null

        const participants = Array.from(roomRef.current.remoteParticipants.values())
        for (const participant of participants) {
            // Agent participants have kind AGENT
            if (participant.kind === ParticipantKind.AGENT) {
                return participant
            }
        }
        return null
    }, [])

    // Handle file upload with RPC trigger
    const handleUpload = async (file: File) => {
        if (!file.name.endsWith(".pdf")) {
            alert("Please upload a PDF file")
            return
        }

        setIsUploading(true)
        setUploadSuccess(false)
        setIsProcessing(false)

        try {
            // Step 1: Upload file to server
            const formData = new FormData()
            formData.append("file", file)

            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            })

            const data = await response.json()

            if (data.error) {
                console.error("Upload failed:", data.error)
                setIsUploading(false)
                return
            }

            // Step 2: Trigger agent RPC to reload cookbook
            setIsUploading(false)
            setIsProcessing(true)

            const agentParticipant = findAgentParticipant()
            if (agentParticipant && roomRef.current) {
                try {
                    console.log("Calling reload_cookbook RPC on agent:", agentParticipant.identity)
                    const rpcResponse = await roomRef.current.localParticipant.performRpc({
                        destinationIdentity: agentParticipant.identity,
                        method: "reload_cookbook",
                        payload: JSON.stringify({ filename: file.name }),
                    })
                    console.log("RPC response:", rpcResponse)
                } catch (rpcError) {
                    console.error("RPC failed:", rpcError)
                }
            } else {
                console.warn("Agent participant not found, skipping RPC")
            }

            // Step 3: Show success state
            setIsProcessing(false)
            setUploadSuccess(true)
            setUploadedFiles((prev) => prev + 1)

            // Reset success state after 2 seconds
            setTimeout(() => {
                setUploadSuccess(false)
            }, 2000)
        } catch (error) {
            console.error("Upload error:", error)
            setIsUploading(false)
            setIsProcessing(false)
        }
    }


    const handleDisconnect = async () => {
        // clear the RAG index on disconnect so each session starts fresh
        try {
            const agentParticipant = findAgentParticipant()
            if (agentParticipant && roomRef.current) {
                console.log("Clearing cookbook on disconnect...")
                await roomRef.current.localParticipant.performRpc({
                    destinationIdentity: agentParticipant.identity,
                    method: "clear_cookbook_silent",
                    payload: "{}",
                })
            }
        } catch (error) {
            console.log("Clear on disconnect skipped (agent disconnected)")
        }

        setViewState("hero")
        setToken("")
        setSelectedVoice(null)
        setIsClicked(false)
        setUploadedFiles(0)
        roomRef.current = null
    }

    // clears cookbook
    const handleClear = async () => {
        setIsClearing(true)

        try {
            const agentParticipant = findAgentParticipant()
            if (agentParticipant && roomRef.current) {
                console.log("Calling clear_cookbook RPC on agent:", agentParticipant.identity)
                await roomRef.current.localParticipant.performRpc({
                    destinationIdentity: agentParticipant.identity,
                    method: "clear_cookbook",
                    payload: "{}",
                })
                setUploadedFiles(0)
            } else {
                console.warn("Agent participant not found, skipping RPC")
            }
        } catch (error) {
            console.error("Clear error:", error)
        } finally {
            setIsClearing(false)
        }
    }

    // Handle room connection
    const handleRoomConnected = (connectedRoom: Room) => {
        roomRef.current = connectedRoom
        console.log("Room connected, stored reference for RPC calls")
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

            <div className="relative flex flex-col items-center gap-12 z-10 w-full max-w-6xl">

                {/* ============ HERO VIEW ============ */}
                {viewState === "hero" && (
                    <HeroView
                        isHovered={isHovered}
                        isClicked={isClicked}
                        onHover={setIsHovered}
                        onArrowClick={handleArrowClick}
                    />
                )}

                {/* ============ VOICE SELECTION VIEW ============ */}
                {viewState === "voice-select" && (
                    <VoiceSelectView
                        onVoiceSelect={handleVoiceSelect}
                        onBack={handleBack}
                    />
                )}

                {/* ============ VOICE ACTIVE VIEW ============ */}
                {viewState === "voice-active" && token && livekitUrl && (
                    <LiveKitRoom
                        token={token}
                        serverUrl={livekitUrl}
                        connect={true}
                        audio={true}
                        video={false}
                        onConnected={() => {
                            // Access room via callback when connected
                        }}
                        onDisconnected={handleDisconnect}
                        className="w-full h-full"
                        room={roomRef.current || undefined}
                        onError={(error) => console.error("LiveKit error:", error)}
                    >
                        <RoomConnector onRoomConnected={handleRoomConnected} />
                        <VoiceActiveContent
                            onUpload={handleUpload}
                            onClear={handleClear}
                            isUploading={isUploading}
                            isProcessing={isProcessing}
                            isClearing={isClearing}
                            uploadSuccess={uploadSuccess}
                            fileCount={uploadedFiles}
                            onDisconnect={handleDisconnect}
                        />
                    </LiveKitRoom>
                )}
            </div>
        </section>
    )
}

// Helper component to get room reference
function RoomConnector({ onRoomConnected }: { onRoomConnected: (room: Room) => void }) {
    const room = useRoomContext()

    useEffect(() => {
        if (room) {
            onRoomConnected(room)
        }
    }, [room, onRoomConnected])

    return null
}
