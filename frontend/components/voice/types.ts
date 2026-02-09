export interface TranscriptEntry {
    id: string
    speaker: "user" | "agent"
    text: string
    timestamp: Date
    isFinal: boolean
}

export type ViewState = "hero" | "voice-select" | "voice-active"

export interface HeroSectionProps {
    livekitUrl: string
}

export interface VoiceActiveContentProps {
    onUpload: (file: File) => Promise<void>
    onClear: () => Promise<void>
    isUploading: boolean
    isProcessing: boolean
    isClearing: boolean
    uploadSuccess: boolean
    fileCount: number
    onDisconnect: () => void
}

export interface VoiceSelectViewProps {
    onVoiceSelect: (voice: "male" | "female", apiKey?: string) => void
    onBack: () => void
}

export interface HeroViewProps {
    isHovered: boolean
    isClicked: boolean
    onHover: (hovered: boolean) => void
    onArrowClick: (e: React.MouseEvent) => void
}

export interface ChatPanelProps {
    transcript: TranscriptEntry[]
    onClose: () => void
}

export interface Timer {
    id: string
    label: string
    totalSeconds: number
    remainingSeconds: number
    startedAt: number
}

export interface ShoppingItem {
    id: string
    name: string
    category: string
    emoji: string
    quantity: number
    estimated_price?: number
}

export interface RecipeStep {
    step_number: number
    instruction: string
    duration?: string
    duration_minutes?: number
    tips?: string
    completed?: boolean
}

export interface Ingredient {
    name: string
    quantity: string
    emoji: string
}

export interface RecipePlan {
    id: string
    title?: string
    name?: string
    steps: RecipeStep[]
    ingredients: Ingredient[]
    current_step_index: number
    servings?: string
    prep_time?: string
    cook_time?: string
}
