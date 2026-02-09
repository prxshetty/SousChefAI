"use client"

import React, { useEffect, useRef, useState, useCallback } from "react"
import { motion, AnimatePresence } from "motion/react"
import { ArrowLeft, ArrowRight, Check, Clock, ChefHat, UtensilsCrossed, Play } from "lucide-react"
import { RecipePlan } from "@/components/voice/types"
import { cn } from "@/lib/utils"

interface CookingViewProps {
    recipe: RecipePlan
    onNext: () => void
    onPrev: () => void
    onComplete: () => void
}

interface YouTubeVideo {
    videoId: string
    title: string
    thumbnail: string
}

export function CookingView({ recipe, onNext, onPrev, onComplete }: CookingViewProps) {
    const currentStep = recipe.steps[recipe.current_step_index]
    const scrollRef = useRef<HTMLDivElement>(null)
    const [video, setVideo] = useState<YouTubeVideo | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [videoError, setVideoError] = useState(false)

    // Video cache to prevent refetching when navigating steps
    const videoCacheRef = useRef<Map<string, YouTubeVideo | null>>(new Map())

    // Fetch YouTube video for current step (with caching)
    const fetchVideo = useCallback(async (instruction: string) => {
        // Check cache first
        if (videoCacheRef.current.has(instruction)) {
            const cached = videoCacheRef.current.get(instruction)
            setVideo(cached || null)
            setVideoError(!cached)
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        setVideoError(false)
        try {
            const response = await fetch(`/api/youtube?q=${encodeURIComponent(instruction)}`)
            if (response.ok) {
                const data = await response.json()
                // Cache the result
                videoCacheRef.current.set(instruction, data)
                setVideo(data)
            } else {
                videoCacheRef.current.set(instruction, null)
                setVideoError(true)
                setVideo(null)
            }
        } catch {
            videoCacheRef.current.set(instruction, null)
            setVideoError(true)
            setVideo(null)
        } finally {
            setIsLoading(false)
        }
    }, [])

    // Fetch video when step changes
    useEffect(() => {
        if (currentStep?.instruction) {
            fetchVideo(currentStep.instruction)
        }
    }, [currentStep?.instruction, fetchVideo])

    // Auto-scroll the ingredients list
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0
        }
    }, [recipe.current_step_index])

    const isLastStep = recipe.current_step_index === recipe.steps.length - 1
    const isFirstStep = recipe.current_step_index === 0
    const progress = ((recipe.current_step_index + 1) / recipe.steps.length) * 100

    return (
        <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
            {/* Header - Minimal & Clean */}


            {/* Main Content - 2 Columns (40/60 split for better readability) */}
            <div className="flex flex-1 min-h-0 bg-secondary/30">
                {/* LEFT COLUMN: Instructions & Ingredients (40%) */}
                <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="w-[40%] flex-shrink-0 border-r border-border/40 bg-background flex flex-col"
                >
                    {/* Header - Minimal & Clean (Moved to Left Column) */}
                    <div className="flex-shrink-0 px-8 py-5 bg-background border-b border-border/40">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-orange-50 rounded-xl">
                                    <UtensilsCrossed className="size-5 text-orange-600" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-serif text-foreground tracking-tight">
                                        {recipe.title || "Cooking Session"}
                                    </h1>
                                    <div className="flex items-center gap-3 mt-0.5">
                                        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                                            <Clock className="size-3.5" />
                                            {recipe.steps.reduce((acc, step) => acc + (step.duration_minutes || 0), 0) > 0
                                                ? `${recipe.steps.reduce((acc, step) => acc + (step.duration_minutes || 0), 0)} mins`
                                                : "Time varies"}
                                        </span>
                                        <span className="text-sm text-muted-foreground">•</span>
                                        <span className="text-sm text-muted-foreground">
                                            {recipe.steps.length} steps
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 flex flex-col">
                        {/* Step Navigation - Top
                        <div className="flex items-center justify-between mb-8">
                            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                Current Instruction
                            </span>
                            {currentStep.duration_minutes && (
                                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1.5 border border-blue-100">
                                    <Clock className="size-3.5" />
                                    {currentStep.duration_minutes} min
                                </span>
                            )}
                        </div> */}

                        {/* Main Instruction */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep.step_number}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-6"
                            >
                                <h2 className="text-3xl md:text-4xl font-serif text-foreground leading-tight tracking-tight">
                                    {currentStep.instruction}
                                </h2>

                                {currentStep.tips && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        transition={{ delay: 0.2 }}
                                        className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3 items-start"
                                    >
                                        <div className="p-1.5 bg-amber-100 rounded-full shrink-0 mt-0.5">
                                            <div className="size-3 bg-amber-500 rounded-full" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Chef's Tip</p>
                                            <p className="text-amber-900/80 text-sm leading-relaxed">
                                                {currentStep.tips}
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        </AnimatePresence>

                        <div className="flex-1" /> {/* Spacer */}

                        {/* Ingredients Section - Full height, no scroll constraint */}
                        <div className="mt-8 pt-8 border-t border-border/40">
                            <div className="flex items-center gap-2 mb-4">
                                <ChefHat className="size-4 text-orange-500" />
                                <h3 className="text-sm font-medium text-foreground uppercase tracking-wide">Ingredients needed</h3>
                            </div>
                            <div
                                ref={scrollRef}
                                className="grid grid-cols-2 gap-2"
                            >
                                {recipe.ingredients.map((ing, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-2 pl-2 pr-3 py-1.5 bg-secondary hover:bg-secondary/80 transition-colors rounded-lg border border-border/50 group cursor-default"
                                    >
                                        <span className="text-lg group-hover:scale-110 transition-transform">{ing.emoji}</span>
                                        <span className="text-sm font-medium text-foreground/80">
                                            {ing.quantity} {ing.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Navigation Buttons - Minimal outline style */}
                    <div className="p-6 border-t border-border/40 bg-background/80 backdrop-blur-sm sticky bottom-0 z-10 flex gap-4">
                        <button
                            onClick={onPrev}
                            disabled={isFirstStep}
                            className="flex-1 py-2.5 rounded-lg border border-border/60 bg-transparent text-muted-foreground hover:border-foreground/30 hover:text-foreground disabled:opacity-30 disabled:hover:border-border/60 transition-all text-sm font-medium flex items-center justify-center gap-2"
                        >
                            <ArrowLeft className="size-4" />
                            Previous
                        </button>

                        <button
                            onClick={isLastStep ? onComplete : onNext}
                            className={cn(
                                "flex-[2] py-2.5 rounded-lg border transition-all text-sm font-medium flex items-center justify-center gap-2",
                                isLastStep
                                    ? "border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
                                    : "border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white"
                            )}
                        >
                            {isLastStep ? "Finish Cooking" : "Next Step"}
                            {isLastStep ? <Check className="size-4" /> : <ArrowRight className="size-4" />}
                        </button>
                    </div>
                </motion.div>

                {/* RIGHT COLUMN: Video (60%) */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex-1 bg-black relative overflow-hidden h-full"
                >
                    <AnimatePresence mode="wait">
                        {isLoading ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 flex items-center justify-center bg-zinc-900"
                            >
                                <div className="text-center space-y-4">
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-full border-2 border-zinc-800 border-t-orange-500 animate-spin" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-2 h-2 bg-orange-500 rounded-full" />
                                        </div>
                                    </div>
                                    <p className="text-zinc-500 text-sm font-medium animate-pulse">Finding the perfect clip...</p>
                                </div>
                            </motion.div>
                        ) : video ? (
                            <motion.div
                                key={video.videoId}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="w-full h-full"
                            >
                                <iframe
                                    src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1&mute=1&rel=0&modestbranding=1&loop=1`}
                                    title={video.title}
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="fallback"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 flex items-center justify-center bg-zinc-900"
                            >
                                <div className="text-center p-8 max-w-md">
                                    <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-6 shadow-inner ring-1 ring-white/5">
                                        <Play className="size-6 text-zinc-600" />
                                    </div>
                                    <h3 className="text-zinc-300 font-medium text-lg mb-2">
                                        {videoError ? "No video found" : "Video placeholder"}
                                    </h3>
                                    <p className="text-zinc-500 text-sm leading-relaxed">
                                        {videoError
                                            ? "We couldn't find a matching video for this step. Follow the text instructions carefully."
                                            : `Visual guide for: "${currentStep.instruction.slice(0, 50)}..."`}
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>

            {/* Progress Bar - Thin Orange Strip at Bottom */}
            <div className="h-0.5 bg-border relative w-full">
                <motion.div
                    className="absolute inset-y-0 left-0 bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                />
            </div>
        </div>
    )
}
