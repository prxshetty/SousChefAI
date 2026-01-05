"use client"

import React, { useEffect, useRef } from "react"
import { motion, AnimatePresence } from "motion/react"
import { ArrowLeft, ArrowRight, Check, Clock, ChefHat, Flame } from "lucide-react"
import { RecipePlan } from "./types"
import { cn } from "@/lib/utils"

interface CookingViewProps {
    recipe: RecipePlan
    onNext: () => void
    onPrev: () => void
    onComplete: () => void
}

export function CookingView({ recipe, onNext, onPrev, onComplete }: CookingViewProps) {
    const currentStep = recipe.steps[recipe.current_step_index]
    const scrollRef = useRef<HTMLDivElement>(null)

    // Auto-scroll the steps list to keep current step in view
    useEffect(() => {
        if (scrollRef.current) {
            const activeEl = scrollRef.current.querySelector('[data-active="true"]')
            if (activeEl) {
                activeEl.scrollIntoView({ behavior: "smooth", block: "center" })
            }
        }
    }, [recipe.current_step_index])

    const isLastStep = recipe.current_step_index === recipe.steps.length - 1

    return (
        <div className="flex h-full w-full gap-6 p-6 pt-20"> {/* pt-20 to clear top nav/header if any */}

            {/* LEFT PANEL: Ingredients & Steps List */}
            <motion.div
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="w-1/3 flex flex-col gap-6 h-full overflow-hidden"
            >
                {/* Ingredients Card */}
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-sm border border-orange-100/50 max-h-[40%] flex flex-col">
                    <h3 className="font-serif text-xl text-orange-950 mb-4 flex items-center gap-2">
                        <ChefHat className="size-5 text-orange-500" />
                        Ingredients
                    </h3>
                    <div className="overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-orange-200 scrollbar-track-transparent">
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

                {/* Steps List */}
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-sm border border-orange-100/50 flex-1 flex flex-col min-h-0">
                    <h3 className="font-serif text-xl text-orange-950 mb-4 flex items-center gap-2">
                        <Flame className="size-5 text-orange-500" />
                        Steps
                    </h3>
                    <div
                        ref={scrollRef}
                        className="overflow-y-auto pr-2 flex-1 scrollbar-thin scrollbar-thumb-orange-200 scrollbar-track-transparent space-y-3"
                    >
                        {recipe.steps.map((step, idx) => {
                            const isActive = idx === recipe.current_step_index
                            const isCompleted = idx < recipe.current_step_index

                            return (
                                <div
                                    key={idx}
                                    data-active={isActive}
                                    className={cn(
                                        "p-3 rounded-xl border transition-all duration-300 cursor-pointer",
                                        isActive
                                            ? "bg-orange-50 border-orange-200 shadow-sm scale-[1.02]"
                                            : "border-transparent hover:bg-white/50",
                                        isCompleted ? "opacity-60" : "opacity-100"
                                    )}
                                    onClick={() => {
                                        // Optional: Allow clicking to jump steps? 
                                        // For now just valid visual reference
                                    }}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={cn(
                                            "text-xs font-bold uppercase tracking-wider",
                                            isActive ? "text-orange-600" : "text-gray-400"
                                        )}>
                                            Step {step.step_number}
                                        </span>
                                        {isCompleted && <Check className="size-3 text-green-500" />}
                                    </div>
                                    <p className={cn(
                                        "text-sm line-clamp-2",
                                        isActive ? "text-gray-900 font-medium" : "text-gray-500"
                                    )}>
                                        {step.instruction}
                                    </p>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </motion.div>

            {/* RIGHT PANEL: Active Step Focus */}
            <motion.div
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="flex-1 flex flex-col gap-6 h-full"
            >
                {/* Visual Placeholder (Video/Image) */}
                <div className="aspect-video w-full bg-black/5 rounded-3xl overflow-hidden relative flex items-center justify-center border border-white/20 backdrop-blur-sm group">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />

                    {/* Placeholder content for now */}
                    <div className="text-center p-8">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            className="w-24 h-24 rounded-full border-4 border-orange-200 border-t-orange-500 mx-auto mb-4 opacity-50"
                        />
                        <p className="text-gray-500 font-medium">Visualizing step...</p>
                        <p className="text-xs text-gray-400 mt-2">(Camera / Image Gen integration coming soon)</p>
                    </div>
                </div>

                {/* Active Step Content */}
                <div className="flex-1 bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-lg border border-white/50 flex flex-col justify-between relative overflow-hidden">
                    {/* Background blob decoration */}
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-orange-100/50 rounded-full blur-3xl pointer-events-none" />

                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <span className="px-4 py-1.5 bg-orange-100 text-orange-700 rounded-full text-sm font-bold tracking-wide">
                                STEP {currentStep.step_number} OF {recipe.steps.length}
                            </span>
                            {currentStep.duration_minutes && (
                                <span className="px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium flex items-center gap-2">
                                    <Clock className="size-4" />
                                    {currentStep.duration_minutes} mins
                                </span>
                            )}
                        </div>

                        <AnimatePresence mode="wait">
                            <motion.h2
                                key={currentStep.step_number}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="text-3xl md:text-4xl font-serif text-gray-900 leading-tight"
                            >
                                {currentStep.instruction}
                            </motion.h2>
                        </AnimatePresence>

                        {currentStep.tips && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="mt-8 p-4 bg-yellow-50/80 rounded-xl border border-yellow-100"
                            >
                                <p className="text-yellow-800 text-sm flex gap-2">
                                    <span className="font-bold">💡 Chef's Tip:</span>
                                    {currentStep.tips}
                                </p>
                            </motion.div>
                        )}
                    </div>

                    {/* Navigation Bar */}
                    <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
                        <button
                            onClick={onPrev}
                            disabled={recipe.current_step_index === 0}
                            className="flex items-center gap-2 px-6 py-3 rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all font-medium"
                        >
                            <ArrowLeft className="size-5" />
                            Previous
                        </button>

                        <button
                            onClick={isLastStep ? onComplete : onNext}
                            className={cn(
                                "flex items-center gap-2 px-8 py-3 rounded-full text-white shadow-lg shadow-orange-500/20 transition-all font-bold",
                                isLastStep
                                    ? "bg-green-600 hover:bg-green-700"
                                    : "bg-orange-500 hover:bg-orange-600"
                            )}
                        >
                            {isLastStep ? "Finish Cooking" : "Next Step"}
                            {isLastStep ? <Check className="size-5" /> : <ArrowRight className="size-5" />}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
