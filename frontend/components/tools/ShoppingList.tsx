"use client"

import React from "react"
import { motion, AnimatePresence } from "motion/react"
import { ShoppingCart, Trash2, Plus, Minus, Copy, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"
import { ShoppingItem } from "@/components/voice/types"

interface ShoppingListProps {
    items: ShoppingItem[]
    onRemoveItem: (id: string) => void
    onUpdateQuantity: (id: string, quantity: number) => void
    onClearAll: () => void
}

const categoryColors: Record<string, string> = {
    Dairy: "bg-blue-500/20 text-blue-600",
    Produce: "bg-green-500/20 text-green-600",
    Meat: "bg-red-500/20 text-red-600",
    Seafood: "bg-cyan-500/20 text-cyan-600",
    Bakery: "bg-amber-500/20 text-amber-700",
    Pantry: "bg-orange-500/20 text-orange-600",
    Frozen: "bg-indigo-500/20 text-indigo-600",
    Beverages: "bg-purple-500/20 text-purple-600",
    Spices: "bg-yellow-500/20 text-yellow-700",
    Other: "bg-gray-500/20 text-gray-600",
}

export function ShoppingList({ items, onRemoveItem, onUpdateQuantity, onClearAll }: ShoppingListProps) {
    if (items.length === 0) return null

    // Group items by category
    const groupedItems = items.reduce((acc, item) => {
        const category = item.category || "Other"
        if (!acc[category]) acc[category] = []
        acc[category].push(item)
        return acc
    }, {} as Record<string, ShoppingItem[]>)

    // Calculate estimated total
    const estimatedTotal = items.reduce((sum, item) => sum + (item.estimated_price || 0), 0)

    // Copy list to clipboard
    const handleCopy = () => {
        const text = items.map(i => `${i.emoji} ${i.name} x${i.quantity}`).join("\n")
        navigator.clipboard.writeText(text)
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="fixed left-4 bottom-4 z-50"
        >
            <div className="w-72 border rounded-2xl bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                    <div className="flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold">Shopping List</span>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {items.length}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleCopy}
                            className="p-1.5 rounded-full hover:bg-muted transition-colors"
                            title="Copy list"
                        >
                            <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={onClearAll}
                            className="p-1.5 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                            title="Clear all"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Items grouped by category */}
                <div className="max-h-[300px] overflow-y-auto">
                    <AnimatePresence mode="popLayout">
                        {Object.entries(groupedItems).map(([category, categoryItems]) => (
                            <motion.div
                                key={category}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="border-b last:border-b-0"
                            >
                                {/* Category header */}
                                <div className={cn(
                                    "px-3 py-1 text-[10px] font-semibold uppercase tracking-wider",
                                    categoryColors[category] || categoryColors.Other
                                )}>
                                    {category}
                                </div>

                                {/* Items */}
                                {categoryItems.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        layout
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20, height: 0 }}
                                        className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors group"
                                    >
                                        {/* Emoji */}
                                        <span className="text-lg flex-shrink-0">{item.emoji}</span>

                                        {/* Name + Price */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{item.name}</p>
                                            {item.estimated_price && (
                                                <p className="text-[10px] text-muted-foreground">
                                                    ~${item.estimated_price.toFixed(2)}
                                                </p>
                                            )}
                                        </div>

                                        {/* Quantity controls */}
                                        <div className="flex items-center gap-0.5">
                                            <button
                                                onClick={() => onUpdateQuantity(item.id, Math.max(0, item.quantity - 1))}
                                                className="p-1 hover:bg-muted rounded-full transition-colors"
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="text-xs font-semibold w-4 text-center">
                                                {item.quantity}
                                            </span>
                                            <button
                                                onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                                className="p-1 hover:bg-muted rounded-full transition-colors"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Footer with Estimated Total */}
                {estimatedTotal > 0 && (
                    <div className="flex items-center justify-between p-3 border-t bg-muted/20">
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            Estimated Total
                        </span>
                        <span className="text-sm font-bold text-green-600">
                            ~${estimatedTotal.toFixed(2)}
                        </span>
                    </div>
                )}
            </div>
        </motion.div>
    )
}
