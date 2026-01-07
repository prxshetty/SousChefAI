'use client';

import { HeroSection } from '@/components/voice/VoiceSession';

export default function Home() {
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || '';

    return (
        <main className="min-h-screen bg-background">
            <HeroSection livekitUrl={livekitUrl} />
        </main>
    );
}
