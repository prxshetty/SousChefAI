import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        if (!file.name.endsWith('.pdf')) {
            return NextResponse.json(
                { error: 'Only PDF files are allowed' },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const agentDataDir = join(process.cwd(), '..', 'agent', 'data');

        await mkdir(agentDataDir, { recursive: true });
        const filePath = join(agentDataDir, file.name);
        await writeFile(filePath, buffer);

        return NextResponse.json({
            success: true,
            filename: file.name,
            message: 'PDF uploaded successfully. Restart the agent to index the new document.'
        });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: 'Failed to upload file' },
            { status: 500 }
        );
    }
}
