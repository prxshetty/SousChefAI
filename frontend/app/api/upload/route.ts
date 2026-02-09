import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readdir, unlink } from 'fs/promises';
import { join } from 'path';
import { GoogleGenAI } from '@google/genai';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const PDF_EXTENSION = '.pdf';

async function extractTextFromImage(imageBuffer: Buffer, mimeType: string): Promise<string> {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error('GOOGLE_API_KEY or GEMINI_API_KEY is required for image OCR');
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Extract ALL text from this recipe image. This may be a handwritten recipe, a printed recipe, or a cookbook page.

Output the extracted text in a clean, readable format:
- Include the recipe title/name if visible
- List all ingredients with quantities
- Include all cooking instructions/steps
- Preserve any notes, tips, or variations mentioned

If the handwriting is difficult to read, zoom in and inspect closely. Use your code execution capability to crop and analyze specific sections if needed.

Output ONLY the extracted recipe text, no commentary:`;

    // Use Gemini 3 Flash with Agentic Vision (code execution enabled)
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
            {
                role: 'user',
                parts: [
                    {
                        inlineData: {
                            data: imageBuffer.toString('base64'),
                            mimeType: mimeType,
                        },
                    },
                    { text: prompt },
                ],
            },
        ],
        config: {
            tools: [{ codeExecution: {} }], // Enable Agentic Vision
        },
    });

    // Extract text from response parts
    let extractedText = '';
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.text) {
            extractedText += part.text;
        }
    }

    return extractedText || 'No text could be extracted from the image.';
}

function getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.substring(lastDot).toLowerCase() : '';
}

function getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
    };
    return mimeTypes[extension] || 'application/octet-stream';
}

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

        const extension = getFileExtension(file.name);
        const isImage = IMAGE_EXTENSIONS.includes(extension);
        const isPDF = extension === PDF_EXTENSION;

        if (!isImage && !isPDF) {
            return NextResponse.json(
                { error: 'Only PDF and image files (JPG, PNG, WebP) are allowed' },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        // Clear existing files in data directory for fresh upload
        const agentDataDir = join(process.cwd(), '..', 'agent', 'data');
        await mkdir(agentDataDir, { recursive: true });

        try {
            const existingFiles = await readdir(agentDataDir);
            await Promise.all(
                existingFiles.map(async (file) => {
                    const filePath = join(agentDataDir, file);
                    try {
                        await unlink(filePath);
                        console.log(`Cleared old file: ${file}`);
                    } catch (err) {
                        // Ignore error if it's a directory or permission issue
                        console.warn(`Could not delete ${file}:`, err);
                    }
                })
            );
        } catch (err) {
            console.log('No existing files to clear or error reading dir:', err);
        }

        if (isPDF) {
            // Save PDF directly
            const filePath = join(agentDataDir, file.name);
            await writeFile(filePath, buffer);

            return NextResponse.json({
                success: true,
                filename: file.name,
                type: 'pdf',
                message: 'PDF uploaded successfully.'
            });
        } else {
            // Extract text from image using Gemini Vision
            console.log(`Extracting text from image: ${file.name}`);
            const extractedText = await extractTextFromImage(buffer, getMimeType(extension));

            // Save as .txt file for RAG indexing
            const baseName = file.name.substring(0, file.name.lastIndexOf('.'));
            const txtFileName = `${baseName}_recipe.txt`;
            const filePath = join(agentDataDir, txtFileName);
            await writeFile(filePath, extractedText);

            console.log(`Saved extracted text to: ${txtFileName}`);

            return NextResponse.json({
                success: true,
                filename: txtFileName,
                originalFilename: file.name,
                type: 'image',
                extractedTextPreview: extractedText.substring(0, 200) + (extractedText.length > 200 ? '...' : ''),
                message: 'Recipe image processed! Text extracted and ready for indexing.'
            });
        }
    } catch (error) {
        console.error('Upload error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to process file';
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
