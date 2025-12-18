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
    isUploading: boolean
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
