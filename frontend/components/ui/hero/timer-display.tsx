"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { X, Bell } from "lucide-react"
import { Timer } from "./types"
import { cn } from "@/lib/utils"

interface TimerDisplayProps {
    timers: Timer[]
    onRemoveTimer: (id: string) => void
}

// Number of tick segments in the circular progress
const TOTAL_TICKS = 60

export function TimerDisplay({ timers, onRemoveTimer }: TimerDisplayProps) {
    const [currentTimes, setCurrentTimes] = useState<Record<string, number>>({})

    // Update timer countdown every second
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now()
            const newTimes: Record<string, number> = {}

            timers.forEach((timer) => {
                const elapsed = Math.floor((now - timer.startedAt) / 1000)
                const remaining = Math.max(0, timer.totalSeconds - elapsed)
                newTimes[timer.id] = remaining
            })

            setCurrentTimes(newTimes)
        }, 1000)

        return () => clearInterval(interval)
    }, [timers])

    // Format time as MM:SS
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }

    // Calculate elapsed time in seconds
    const getElapsed = (timer: Timer) => {
        const remaining = currentTimes[timer.id] ?? timer.remainingSeconds
        return timer.totalSeconds - remaining
    }

    // Calculate progress as fraction (0 to 1)
    const getProgressFraction = (timer: Timer) => {
        const remaining = currentTimes[timer.id] ?? timer.remainingSeconds
        return (timer.totalSeconds - remaining) / timer.totalSeconds
    }

    if (timers.length === 0) return null

    return (
        <motion.div
            className="fixed bottom-4 right-4 z-50 flex gap-3 max-w-[50vw] overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
        >
            <AnimatePresence mode="popLayout">
                {timers.map((timer) => {
                    const remaining = currentTimes[timer.id] ?? timer.remainingSeconds
                    const elapsed = getElapsed(timer)
                    const isComplete = remaining === 0
                    const progressFraction = getProgressFraction(timer)
                    const activeTicks = Math.floor(progressFraction * TOTAL_TICKS)

                    return (
                        <motion.div
                            key={timer.id}
                            layout
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className={cn(
                                "relative flex flex-col items-center p-4 rounded-2xl backdrop-blur-xl group",
                                "bg-white",
                                isComplete && "ring-2 ring-orange-500"
                            )}
                        >
                            {/* Close button */}
                            <button
                                onClick={() => onRemoveTimer(timer.id)}
                                className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-all z-10 opacity-0 group-hover:opacity-100"
                            >
                                <X className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>

                            {/* Circular segmented progress ring */}
                            <div className="relative w-32 h-32 flex items-center justify-center">
                                <svg
                                    className="w-full h-full"
                                    viewBox="0 0 200 200"
                                >
                                    {/* Generate tick segments */}
                                    {Array.from({ length: TOTAL_TICKS }).map((_, index) => {
                                        const angle = (index / TOTAL_TICKS) * 360 - 90 // Start from top
                                        const radians = (angle * Math.PI) / 180
                                        const innerRadius = 75
                                        const outerRadius = 92

                                        // Calculate start and end points for each tick
                                        const x1 = 100 + innerRadius * Math.cos(radians)
                                        const y1 = 100 + innerRadius * Math.sin(radians)
                                        const x2 = 100 + outerRadius * Math.cos(radians)
                                        const y2 = 100 + outerRadius * Math.sin(radians)

                                        const isActive = index < activeTicks

                                        return (
                                            <line
                                                key={index}
                                                x1={x1}
                                                y1={y1}
                                                x2={x2}
                                                y2={y2}
                                                stroke={isActive ? "#EA580C" : "#D1D5DB"}
                                                strokeWidth="3"
                                                strokeLinecap="round"
                                                className="transition-colors duration-300"
                                            />
                                        )
                                    })}
                                </svg>

                                {/* Center content - Elapsed time */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    {isComplete ? (
                                        <motion.div
                                            animate={{ scale: [1, 1.1, 1] }}
                                            transition={{ duration: 0.8, repeat: Infinity }}
                                            className="flex flex-col items-center"
                                        >
                                            <Bell className="w-6 h-6 text-orange-500 mb-1" />
                                            <span className="text-2xl font-light tracking-tight text-foreground">
                                                Done!
                                            </span>
                                        </motion.div>
                                    ) : (
                                        <span className="text-3xl font-light tracking-tight text-foreground">
                                            {formatTime(elapsed)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Timer label */}
                            {timer.label && (
                                <span className="text-sm text-muted-foreground mt-2 truncate max-w-[120px] text-center font-medium">
                                    {timer.label}
                                </span>
                            )}

                            {/* Complete animation overlay */}
                            {isComplete && (
                                <motion.div
                                    className="absolute inset-0 rounded-2xl bg-orange-500/5"
                                    animate={{ opacity: [0.3, 0.1, 0.3] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                />
                            )}
                        </motion.div>
                    )
                })}
            </AnimatePresence>
        </motion.div>
    )
}
