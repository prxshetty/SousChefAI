"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { ArrowUpRight, Timer, ShoppingCart, Key, MessageSquare, Eye } from "lucide-react"
import { motion } from "motion/react"
import { VoiceSelectViewProps } from "@/components/voice/types"

const features = [
    {
        icon: MessageSquare,
        title: "Dialogue",
        description: "Natural voice-to-voice"
    },
    {
        icon: Timer,
        title: "Tools",
        description: "Timers & cooking steps"
    },
    {
        icon: ShoppingCart,
        title: "Memory",
        description: "Adaptive shopping lists"
    },
    {
        icon: Eye,
        title: "Vision",
        description: "PDF & Image ingestion"
    },
]

export function VoiceSelectView({ onVoiceSelect, onBack }: VoiceSelectViewProps) {
    const [selectedVoice, setSelectedVoice] = useState<"male" | "female" | null>(null)
    const [apiKey, setApiKey] = useState("")
    const [isHovered, setIsHovered] = useState(false)
    const [isClicked, setIsClicked] = useState(false)

    const handleNextClick = () => {
        if (selectedVoice && apiKey.trim()) {
            setIsClicked(true)
            setTimeout(() => {
                onVoiceSelect(selectedVoice, apiKey.trim())
            }, 500)
        }
    }

    const canProceed = selectedVoice !== null && apiKey.trim() !== ""

    return (
        <motion.div
            className="flex flex-col items-center gap-8"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
        >
            <span className="text-xs font-medium tracking-[0.3em] uppercase text-muted-foreground">
                Select a voice
            </span>

            <div className="flex gap-12">
                {/* Female Voice */}
                <motion.button
                    onClick={() => setSelectedVoice("female")}
                    className="flex flex-col items-center gap-3 group cursor-pointer"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <div className={cn(
                        "relative w-24 h-24 rounded-full border-2 overflow-hidden transition-all duration-300",
                        selectedVoice === "female" ? "border-emerald-500 ring-4 ring-emerald-500/20" : "group-hover:border-foreground"
                    )}>
                        <img
                            src="/female-chef.png"
                            alt="Female chef"
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                    </div>
                    <span className={cn(
                        "text-sm font-medium tracking-widest uppercase transition-colors",
                        selectedVoice === "female" ? "text-emerald-500" : "text-muted-foreground group-hover:text-foreground"
                    )}>
                        Female
                    </span>
                </motion.button>

                {/* Male Voice */}
                <motion.button
                    onClick={() => setSelectedVoice("male")}
                    className="flex flex-col items-center gap-3 group cursor-pointer"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <div className={cn(
                        "relative w-24 h-24 rounded-full border-2 overflow-hidden transition-all duration-300",
                        selectedVoice === "male" ? "border-emerald-500 ring-4 ring-emerald-500/20" : "group-hover:border-foreground"
                    )}>
                        <img
                            src="/male-chef.png"
                            alt="Male chef"
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                    </div>
                    <span className={cn(
                        "text-sm font-medium tracking-widest uppercase transition-colors",
                        selectedVoice === "male" ? "text-emerald-500" : "text-muted-foreground group-hover:text-foreground"
                    )}>
                        Male
                    </span>
                </motion.button>
            </div>

            {/* API Key Input */}
            <motion.div
                className="flex items-center gap-2 mt-4 w-full max-w-xs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
            >
                <div className="relative w-full">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Gemini API Key"
                        required
                        className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-background/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-all"
                    />
                </div>
            </motion.div>

            {/* Next Button - Hero Style */}
            <motion.div
                className={cn(
                    "relative mt-4 flex size-14 items-center justify-center transition-all duration-500",
                    canProceed ? "cursor-pointer" : "opacity-30 grayscale cursor-not-allowed"
                )}
                onMouseEnter={() => canProceed && setIsHovered(true)}
                onMouseLeave={() => canProceed && setIsHovered(false)}
                onClick={handleNextClick}
                initial={{ opacity: 0, y: 10 }}
                animate={{
                    opacity: isClicked ? 0 : 1,
                    y: isClicked ? -40 : 0,
                    scale: isClicked ? 0.95 : 1,
                }}
                transition={{ delay: 0.4, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
                <motion.div
                    className="pointer-events-none absolute inset-0 rounded-full border"
                    animate={{
                        borderColor: isClicked ? "var(--foreground)" : isHovered ? "var(--foreground)" : "var(--border)",
                        backgroundColor: isClicked ? "transparent" : isHovered ? "var(--foreground)" : "transparent",
                        scale: isClicked ? 3 : isHovered ? 1.1 : 1,
                        opacity: isClicked ? 0 : 1,
                    }}
                    transition={{ duration: isClicked ? 0.7 : 0.5 }}
                />
                <motion.div
                    animate={{
                        x: isClicked ? 100 : isHovered ? 2 : 0,
                        y: isClicked ? -100 : isHovered ? -2 : 0,
                        scale: isClicked ? 0.5 : 1,
                        opacity: isClicked ? 0 : 1,
                    }}
                    transition={{ duration: isClicked ? 0.6 : 0.5 }}
                >
                    <ArrowUpRight
                        className="size-6"
                        style={{ color: isHovered && !isClicked ? "var(--background)" : "var(--foreground)" }}
                    />
                </motion.div>
            </motion.div>

            {/* Feature hints - Below back button */}
            <motion.div
                className="flex items-center justify-center gap-8 mt-8"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
            >
                {features.map((feature, index) => (
                    <motion.div
                        key={feature.title}
                        className="flex flex-col items-center gap-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 + index * 0.1, duration: 0.3 }}
                    >
                        <div className="p-3 rounded-xl border border-border bg-background/50">
                            <feature.icon className="size-5 text-muted-foreground" strokeWidth={1.5} />
                        </div>
                        <div className="flex flex-col items-center gap-0.5">
                            <span className="text-sm font-medium text-foreground">
                                {feature.title}
                            </span>
                            <span className="text-[10px] text-muted-foreground/60 max-w-[100px] text-center leading-tight">
                                {feature.description}
                            </span>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            {/* API Key Input */}
        </motion.div>
    )
}

