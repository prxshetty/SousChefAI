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

    // Fetch YouTube video for current step
    const fetchVideo = useCallback(async (instruction: string) => {
        setIsLoading(true)
        setVideoError(false)
        try {
            const response = await fetch(`/api/youtube?q=${encodeURIComponent(instruction)}`)
            if (response.ok) {
                const data = await response.json()
                setVideo(data)
            } else {
                setVideoError(true)
                setVideo(null)
            }
        } catch {
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

    // Calculate total cooking time
    const totalTime = recipe.steps.reduce((acc, step) => acc + (step.duration_minutes || 0), 0)

    return (
        <div className="flex flex-col h-screen w-full overflow-hidden bg-gradient-to-br from-orange-50/50 to-amber-50/50">
            {/* Header - Dish Summary */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex-shrink-0 px-6 py-4 bg-white/80 backdrop-blur-xl border-b border-orange-100/50"
            >
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl shadow-lg shadow-orange-200">
                            <UtensilsCrossed className="size-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-serif font-bold text-gray-900">
                                {recipe.title || "Cooking Session"}
                            </h1>
                            <div className="flex items-center gap-4 mt-1">
                                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                                    <Clock className="size-4" />
                                    {totalTime > 0 ? `${totalTime} mins total` : "Time varies"}
                                </span>
                                <span className="text-sm text-gray-500">
                                    {recipe.steps.length} steps
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-bold">
                            Step {currentStep.step_number} of {recipe.steps.length}
                        </span>
                    </div>
                </div>
            </motion.div>

            {/* Main Content - 3 Columns */}
            <div className="flex flex-1 min-h-0 gap-4 p-4">
                {/* LEFT COLUMN: Ingredients (~20%) */}
                <motion.div
                    initial={{ x: -30, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="w-[18%] flex-shrink-0"
                >
                    <div className="h-full bg-white/90 backdrop-blur-xl rounded-2xl p-5 shadow-sm border border-orange-100/50 flex flex-col">
                        <h3 className="font-serif text-lg text-orange-950 mb-4 flex items-center gap-2 flex-shrink-0">
                            <ChefHat className="size-5 text-orange-500" />
                            Ingredients
                        </h3>
                        <div
                            ref={scrollRef}
                            className="overflow-y-auto flex-1 pr-2 scrollbar-thin scrollbar-thumb-orange-200 scrollbar-track-transparent"
                        >
                            <ul className="space-y-2">
                                {recipe.ingredients.map((ing, i) => (
                                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                        <span className="h-1.5 w-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                                        {ing}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </motion.div>

                {/* CENTER COLUMN: Step Content (~35%) */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="w-[35%] flex-shrink-0"
                >
                    <div className="h-full bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-sm border border-orange-100/50 flex flex-col relative overflow-hidden">
                        {/* Background decoration */}
                        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-orange-100/40 rounded-full blur-3xl pointer-events-none" />

                        <div className="flex-1 flex flex-col relative z-10">
                            {/* Step header */}
                            <div className="flex items-center gap-3 mb-4 flex-shrink-0">
                                {currentStep.duration_minutes && (
                                    <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium flex items-center gap-1.5">
                                        <Clock className="size-4" />
                                        {currentStep.duration_minutes} mins
                                    </span>
                                )}
                            </div>

                            {/* Step instruction */}
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentStep.step_number}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -15 }}
                                    className="flex-1 flex flex-col"
                                >
                                    <h2 className="text-2xl font-serif text-gray-900 leading-relaxed mb-4">
                                        {currentStep.instruction}
                                    </h2>

                                    {currentStep.tips && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.3 }}
                                            className="mt-auto p-4 bg-yellow-50/90 rounded-xl border border-yellow-200/50"
                                        >
                                            <p className="text-yellow-800 text-sm flex gap-2">
                                                <span className="font-bold">💡 Tip:</span>
                                                {currentStep.tips}
                                            </p>
                                        </motion.div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Navigation */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-4 flex-shrink-0">
                            <button
                                onClick={onPrev}
                                disabled={recipe.current_step_index === 0}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all font-medium text-sm"
                            >
                                <ArrowLeft className="size-4" />
                                Previous
                            </button>

                            <button
                                onClick={isLastStep ? onComplete : onNext}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-2.5 rounded-full text-white shadow-lg transition-all font-bold text-sm",
                                    isLastStep
                                        ? "bg-green-600 hover:bg-green-700 shadow-green-200"
                                        : "bg-orange-500 hover:bg-orange-600 shadow-orange-200"
                                )}
                            >
                                {isLastStep ? "Finish" : "Next"}
                                {isLastStep ? <Check className="size-4" /> : <ArrowRight className="size-4" />}
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* RIGHT COLUMN: YouTube Video (~47%) */}
                <motion.div
                    initial={{ x: 30, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex-1"
                >
                    <div className="h-full bg-black/5 rounded-2xl overflow-hidden border border-white/30 backdrop-blur-sm relative">
                        <AnimatePresence mode="wait">
                            {isLoading ? (
                                <motion.div
                                    key="loading"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50"
                                >
                                    <div className="text-center">
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                            className="w-12 h-12 rounded-full border-3 border-orange-200 border-t-orange-500 mx-auto mb-3"
                                        />
                                        <p className="text-gray-500 text-sm">Finding video...</p>
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
                                    className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-50"
                                >
                                    <div className="text-center p-8">
                                        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
                                            <Play className="size-6 text-gray-400" />
                                        </div>
                                        <p className="text-gray-500 font-medium">
                                            {videoError ? "Couldn't find a video" : "Video will appear here"}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-2">
                                            Searching for: "{currentStep.instruction.slice(0, 40)}..."
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
