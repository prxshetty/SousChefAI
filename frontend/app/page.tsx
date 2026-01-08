'use client';

import { HeroSection } from '@/components/voice/VoiceSession';
import { Particles } from '@/components/bg-particle';

export default function Home() {
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || '';

    return (
        <main className="min-h-screen bg-background relative">
            <Particles className="fixed inset-0 z-0" quantity={50} />
            <HeroSection livekitUrl={livekitUrl} />
        </main>
    );
}
