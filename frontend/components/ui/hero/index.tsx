"use client"

import React, { useState } from "react"
import { LiveKitRoom } from "@livekit/components-react"

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

    // Handle disconnect
    const handleDisconnect = () => {
        setViewState("hero")
        setToken("")
        setSelectedVoice(null)
        setIsClicked(false)
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
                        onDisconnected={handleDisconnect}
                        className="w-full h-full"
                    >
                        <VoiceActiveContent
                            onUpload={handleUpload}
                            isUploading={isUploading}
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
