"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Timer as TimerIcon, X, Bell } from "lucide-react"
import { Timer } from "./types"
import { cn } from "@/lib/utils"

interface TimerDisplayProps {
    timers: Timer[]
    onRemoveTimer: (id: string) => void
}

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

    // Calculate progress percentage
    const getProgress = (timer: Timer) => {
        const remaining = currentTimes[timer.id] ?? timer.remainingSeconds
        return ((timer.totalSeconds - remaining) / timer.totalSeconds) * 100
    }

    if (timers.length === 0) return null

    return (
        <motion.div
            className="flex flex-wrap justify-center gap-3 mb-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
        >
            <AnimatePresence mode="popLayout">
                {timers.map((timer) => {
                    const remaining = currentTimes[timer.id] ?? timer.remainingSeconds
                    const isComplete = remaining === 0
                    const progress = getProgress(timer)

                    return (
                        <motion.div
                            key={timer.id}
                            layout
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className={cn(
                                "relative flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-xl",
                                "bg-background/80",
                                isComplete
                                    ? "border-orange-500 bg-orange-500/10"
                                    : "border-border"
                            )}
                        >
                            {/* Progress ring */}
                            <div className="relative w-10 h-10">
                                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                                    {/* Background circle */}
                                    <circle
                                        cx="18"
                                        cy="18"
                                        r="15"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        className="text-muted-foreground/20"
                                    />
                                    {/* Progress circle */}
                                    <circle
                                        cx="18"
                                        cy="18"
                                        r="15"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        strokeDasharray={`${progress} 100`}
                                        strokeLinecap="round"
                                        className={cn(
                                            "transition-all duration-1000",
                                            isComplete ? "text-orange-500" : "text-primary"
                                        )}
                                    />
                                </svg>
                                {/* Center icon */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    {isComplete ? (
                                        <motion.div
                                            animate={{ scale: [1, 1.2, 1] }}
                                            transition={{ duration: 0.5, repeat: Infinity }}
                                        >
                                            <Bell className="w-4 h-4 text-orange-500" />
                                        </motion.div>
                                    ) : (
                                        <TimerIcon className="w-4 h-4 text-muted-foreground" />
                                    )}
                                </div>
                            </div>

                            {/* Timer info */}
                            <div className="flex flex-col">
                                <span className={cn(
                                    "text-lg font-mono font-semibold",
                                    isComplete ? "text-orange-500" : "text-foreground"
                                )}>
                                    {formatTime(remaining)}
                                </span>
                                <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                                    {timer.label}
                                </span>
                            </div>

                            {/* Close button */}
                            <button
                                onClick={() => onRemoveTimer(timer.id)}
                                className="p-1 rounded-full hover:bg-foreground/10 transition-colors ml-1"
                            >
                                <X className="w-4 h-4 text-muted-foreground" />
                            </button>

                            {/* Complete animation overlay */}
                            {isComplete && (
                                <motion.div
                                    className="absolute inset-0 rounded-2xl bg-orange-500/10"
                                    animate={{ opacity: [0.3, 0.1, 0.3] }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                />
                            )}
                        </motion.div>
                    )
                })}
            </AnimatePresence>
        </motion.div>
    )
}
