"use client"

import { useState } from "react"
import { ArrowDownLeft, Timer, ShoppingCart, TextSearch, CookingPot } from "lucide-react"
import { motion } from "motion/react"
import { VoiceSelectViewProps } from "./types"

const features = [
    {
        icon: CookingPot,
        title: "Recipes",
        description: "Ask about any dish"
    },
    {
        icon: Timer,
        title: "Timers",
        description: "Set cooking timers"
    },
    {
        icon: ShoppingCart,
        title: "Shopping",
        description: "Build ingredient lists"
    },
    {
        icon: TextSearch,
        title: "PDFs",
        description: "Upload cookbooks"
    },
]

export function VoiceSelectView({ onVoiceSelect, onBack }: VoiceSelectViewProps) {
    const [isBackHovered, setIsBackHovered] = useState(false)
    const [isBackClicked, setIsBackClicked] = useState(false)

    const handleBackClick = () => {
        setIsBackClicked(true)
        setTimeout(() => {
            onBack()
        }, 400)
    }

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

            <div className="flex gap-8">
                {/* Female Voice */}
                <motion.button
                    onClick={() => onVoiceSelect("female")}
                    className="flex flex-col items-center gap-3 group cursor-pointer"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <div className="relative w-24 h-24 rounded-full border-2 overflow-hidden transition-all duration-300 group-hover:border-foreground">
                        <img
                            src="/female-chef.png"
                            alt="Female chef"
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                    </div>
                    <span className="text-sm font-medium tracking-widest uppercase text-muted-foreground group-hover:text-foreground transition-colors">
                        Female
                    </span>
                </motion.button>

                {/* Male Voice */}
                <motion.button
                    onClick={() => onVoiceSelect("male")}
                    className="flex flex-col items-center gap-3 group cursor-pointer"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <div className="relative w-24 h-24 rounded-full border-2 overflow-hidden transition-all duration-300 group-hover:border-foreground">
                        <img
                            src="/male-chef.png"
                            alt="Male chef"
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                    </div>
                    <span className="text-sm font-medium tracking-widest uppercase text-muted-foreground group-hover:text-foreground transition-colors">
                        Male
                    </span>
                </motion.button>
            </div>

            {/* Back Button - Mirrored arrow style */}
            <motion.div
                className="relative mt-4 flex size-12 items-center justify-center cursor-pointer"
                onMouseEnter={() => setIsBackHovered(true)}
                onMouseLeave={() => setIsBackHovered(false)}
                onClick={handleBackClick}
                initial={{ opacity: 0, y: 10 }}
                animate={{
                    opacity: isBackClicked ? 0 : 1,
                    y: isBackClicked ? 40 : 0,
                    scale: isBackClicked ? 0.95 : 1,
                }}
                transition={{ delay: 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
                <motion.div
                    className="pointer-events-none absolute inset-0 rounded-full border"
                    animate={{
                        borderColor: isBackClicked ? "var(--foreground)" : isBackHovered ? "var(--foreground)" : "var(--border)",
                        backgroundColor: isBackClicked ? "transparent" : isBackHovered ? "var(--foreground)" : "transparent",
                        scale: isBackClicked ? 3 : isBackHovered ? 1.1 : 1,
                        opacity: isBackClicked ? 0 : 1,
                    }}
                    transition={{ duration: isBackClicked ? 0.4 : 0.3 }}
                />
                <motion.div
                    animate={{
                        x: isBackClicked ? -100 : isBackHovered ? -2 : 0,
                        y: isBackClicked ? 100 : isBackHovered ? 2 : 0,
                        scale: isBackClicked ? 0.5 : 1,
                        opacity: isBackClicked ? 0 : 1,
                    }}
                    transition={{ duration: isBackClicked ? 0.4 : 0.3 }}
                >
                    <ArrowDownLeft
                        className="size-5"
                        style={{ color: isBackHovered && !isBackClicked ? "var(--background)" : "var(--foreground)" }}
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
        </motion.div>
    )
}

