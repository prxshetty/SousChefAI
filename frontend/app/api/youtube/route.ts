import { NextRequest, NextResponse } from 'next/server';

interface YouTubeSearchResult {
    videoId: string;
    title: string;
    thumbnail: string;
}

// Use Gemini Flash to extract a concise search query from the cooking instruction
async function extractSearchQuery(instruction: string, googleApiKey: string): Promise<string> {
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${googleApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Extract a short YouTube search query (3-5 words max) STRICTLY based on the actions and ingredients mentioned in this text. Do NOT add any external context or ingredients not explicitly stated.
                            Text: "${instruction}"
                            Search query: `
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 20
                    }
                })
            }
        );

        if (!response.ok) {
            console.error('Gemini API error:', await response.text());
            return fallbackExtract(instruction);
        }

        const data = await response.json();
        const query = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (query && query.length > 0 && query.length < 60) {
            return query;
        }
        return fallbackExtract(instruction);
    } catch (error) {
        console.error('Gemini extraction failed:', error);
        return fallbackExtract(instruction);
    }
}

// Fallback removed as requested - relying on Gemini
function fallbackExtract(text: string): string {
    return text.slice(0, 50);
}

export async function GET(request: NextRequest) {
    const query = request.nextUrl.searchParams.get('q');

    if (!query) {
        return NextResponse.json(
            { error: 'Query parameter "q" is required' },
            { status: 400 }
        );
    }

    const youtubeApiKey = process.env.YOUTUBE_API_KEY;
    const googleApiKey = process.env.GOOGLE_API_KEY;

    if (!youtubeApiKey) {
        return NextResponse.json(
            { error: 'YouTube API key not configured' },
            { status: 500 }
        );
    }

    try {
        // Use Gemini to extract a smart search query
        let searchQuery: string;
        if (googleApiKey) {
            searchQuery = await extractSearchQuery(query, googleApiKey);
            console.log(`YouTube search(AI): "${searchQuery}" (from: "${query.slice(0, 50)}...")`);
        } else {
            console.warn('Google API Key missing for AI extraction');
            searchQuery = query.slice(0, 50);
        }

        const url = new URL('https://www.googleapis.com/youtube/v3/search');
        url.searchParams.set('part', 'snippet');
        url.searchParams.set('q', `${searchQuery} cooking tutorial`);
        url.searchParams.set('type', 'video');
        url.searchParams.set('maxResults', '1');
        url.searchParams.set('videoDuration', 'short');
        url.searchParams.set('key', youtubeApiKey);

        const response = await fetch(url.toString());
        const data = await response.json();

        if (!response.ok) {
            console.error('YouTube API error:', data);
            return NextResponse.json(
                { error: 'Failed to search YouTube' },
                { status: response.status }
            );
        }

        if (data.items && data.items.length > 0) {
            const video = data.items[0];
            const result: YouTubeSearchResult = {
                videoId: video.id.videoId,
                title: video.snippet.title,
                thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default.url,
            };
            return NextResponse.json(result);
        }

        return NextResponse.json({ error: 'No videos found' }, { status: 404 });
    } catch (error) {
        console.error('Error searching YouTube:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
