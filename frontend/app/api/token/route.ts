import { NextRequest, NextResponse } from 'next/server';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

export async function GET(request: NextRequest) {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const voice = request.nextUrl.searchParams.get('voice') || 'female';
    const defaultRoom = `souschef-${voice}-${timestamp}-${randomId}`;

    const room = request.nextUrl.searchParams.get('room') || defaultRoom;
    const username = request.nextUrl.searchParams.get('username') || 'user';
    const apiKeyParam = request.nextUrl.searchParams.get('apiKey') || '';

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
        return NextResponse.json(
            { error: 'LiveKit API credentials not configured' },
            { status: 500 }
        );
    }

    const roomMetadata = JSON.stringify({ voice, apiKey: apiKeyParam });
    const httpUrl = livekitUrl.replace('wss://', 'https://');

    const roomService = new RoomServiceClient(httpUrl, apiKey, apiSecret);
    try {
        await roomService.createRoom({
            name: room,
            metadata: roomMetadata,
        });
        console.log(`Created room ${room} with metadata: ${roomMetadata}`);
    } catch (error) {
        console.error('Error creating room:', error);
    }

    const at = new AccessToken(apiKey, apiSecret, {
        identity: username,
        ttl: '1h',
    });

    at.addGrant({
        roomJoin: true,
        room: room,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        roomCreate: true,
        roomAdmin: true,
    });

    at.metadata = roomMetadata;

    const token = await at.toJwt();

    return NextResponse.json({ token, room, voice });
}
