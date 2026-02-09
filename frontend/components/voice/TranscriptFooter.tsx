"use client"

import React, { useMemo } from "react"
import { motion, AnimatePresence } from "motion/react"
import { AgentState } from "@livekit/components-react"

export interface TranscriptFooterProps {
    transcript: string | null
    agentState: AgentState
    audioVolumes: number[]
    isVisible: boolean
}

const agentStateLabels: Record<AgentState, string> = {
    disconnected: "",
    "pre-connect-buffering": "",
    connecting: "Connecting",
    initializing: "Initializing",
    idle: "",
    listening: "Listening",
    thinking: "Thinking",
    speaking: "Speaking",
    failed: "Connection failed"
}

export function TranscriptFooter({ transcript, agentState, audioVolumes, isVisible }: TranscriptFooterProps) {
    if (!isVisible) return null

    // Calculate average volume for glow intensity
    const avgVolume = useMemo(() => {
        if (!audioVolumes.length) return 0
        const sum = audioVolumes.reduce((a, b) => a + b, 0)
        return Math.min(1, sum / audioVolumes.length)
    }, [audioVolumes])

    // Calculate glow intensity - only for listening/speaking
    const glowIntensity = Math.max(0.4, avgVolume * 3)

    // Show hue only for listening/speaking states
    const showHue = agentState === "listening" || agentState === "speaking"
    const isThinking = agentState === "thinking"

    return (
        <AnimatePresence>
            {(transcript || agentStateLabels[agentState] || avgVolume > 0.02) && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed bottom-0 left-0 right-0 z-40"
                >
                    {/* Orange/Amber Glow Effect - Only for listening/speaking */}
                    <AnimatePresence>
                        {showHue && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 h-40 pointer-events-none"
                                style={{
                                    background: `linear-gradient(to top, 
                                        rgba(251, 146, 60, ${glowIntensity * 0.6}) 0%,
                                        rgba(245, 158, 11, ${glowIntensity * 0.4}) 25%,
                                        rgba(234, 88, 12, ${glowIntensity * 0.2}) 50%,
                                        transparent 100%)`,
                                    filter: `blur(${35 + avgVolume * 50}px)`,
                                    transform: `scaleY(${1 + avgVolume})`,
                                    transformOrigin: 'bottom',
                                    transition: 'all 0.08s ease-out'
                                }}
                            />
                        )}
                    </AnimatePresence>

                    {/* Thinking Pulse Animation - Clean minimal dot pulse */}
                    <AnimatePresence>
                        {isThinking && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5"
                            >
                                {[0, 1, 2].map((i) => (
                                    <motion.div
                                        key={i}
                                        className="w-2 h-2 rounded-full bg-orange-400/80"
                                        animate={{
                                            scale: [1, 1.3, 1],
                                            opacity: [0.4, 1, 0.4],
                                        }}
                                        transition={{
                                            duration: 1.2,
                                            repeat: Infinity,
                                            delay: i * 0.2,
                                            ease: "easeInOut"
                                        }}
                                    />
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Content - Transcript & Agent State at bottom */}
                    <div className="relative py-4 px-6 text-center">
                        <div className="max-w-4xl mx-auto space-y-1">
                            {/* Transcript Text */}
                            {transcript && (
                                <motion.p
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-xl font-light leading-relaxed tracking-wide text-foreground/90 line-clamp-2"
                                >
                                    {transcript}
                                </motion.p>
                            )}

                            {/* Agent Status - only show for non-thinking states or when no transcript */}
                            {agentStateLabels[agentState] && !isThinking && (
                                <motion.p
                                    className="text-xs text-muted-foreground/60 tracking-wider uppercase"
                                    animate={{ opacity: [0.4, 0.7, 0.4] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                >
                                    {agentStateLabels[agentState]}
                                </motion.p>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
