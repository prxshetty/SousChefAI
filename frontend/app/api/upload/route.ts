import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const PDF_EXTENSION = '.pdf';

async function extractTextFromImage(imageBuffer: Buffer, mimeType: string): Promise<string> {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error('GOOGLE_API_KEY or GEMINI_API_KEY is required for image OCR');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const imagePart = {
        inlineData: {
            data: imageBuffer.toString('base64'),
            mimeType: mimeType,
        },
    };

    const prompt = `Extract ALL text from this recipe image. This may be a handwritten recipe, a printed recipe, or a cookbook page.

Output the extracted text in a clean, readable format:
- Include the recipe title/name if visible
- List all ingredients with quantities
- Include all cooking instructions/steps
- Preserve any notes, tips, or variations mentioned

If the handwriting is difficult to read, do your best to interpret it and note any uncertain parts with [?].

Output ONLY the extracted recipe text, no commentary:`;

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    return response.text();
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
        const agentDataDir = join(process.cwd(), '..', 'agent', 'data');
        await mkdir(agentDataDir, { recursive: true });

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
