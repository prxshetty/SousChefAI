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
    onVoiceSelect: (voice: "male" | "female") => void
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
}

export interface RecipeStep {
    step_number: number
    instruction: string
    duration?: string
}

export interface RecipePlan {
    id: string
    title?: string
    steps: RecipeStep[]
    ingredients: string[]
    current_step_index: number
}
