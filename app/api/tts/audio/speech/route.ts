import { type NextRequest, NextResponse } from 'next/server';
import { readFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';

const execAsync = promisify(exec);
const TTS_DIR = path.join(process.cwd(), 'data', 'tts');

// Map OpenAI voice names to Edge TTS voices
const OPENAI_TO_EDGE: Record<string, string> = {
  alloy: 'en-US-GuyNeural',
  echo: 'en-US-JennyNeural',
  fable: 'en-GB-SoniaNeural',
  onyx: 'en-US-GuyNeural',
  nova: 'en-US-AriaNeural',
  shimmer: 'en-US-JennyNeural',
  // Also accept edge-tts native names
  'en-US-GuyNeural': 'en-US-GuyNeural',
  'en-US-JennyNeural': 'en-US-JennyNeural',
  'en-US-AriaNeural': 'en-US-AriaNeural',
  'en-GB-SoniaNeural': 'en-GB-SoniaNeural',
  'en-IN-NeerjaNeural': 'en-IN-NeerjaNeural',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input, voice, speed } = body;

    if (!input) {
      return NextResponse.json({ error: 'Missing input text' }, { status: 400 });
    }

    // Map OpenAI voice to Edge TTS voice
    const voiceKey = (voice || 'alloy').toLowerCase();
    const voiceName = OPENAI_TO_EDGE[voiceKey] || 'en-US-GuyNeural';

    // Create temp directory
    await mkdir(TTS_DIR, { recursive: true });
    const filename = `tts-${randomUUID()}.mp3`;
    const filepath = path.join(TTS_DIR, filename);

    // Build rate argument from speed
    const spd = Number(speed || 1.0);
    const pct = Math.round((spd - 1) * 100);
    const rateArg = spd !== 1.0 ? `--rate "+${pct}%"` : '';

    // Escape text for shell (limit to 4000 chars)
    const escapedText = input
      .substring(0, 4000)
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/`/g, '\\`')
      .replace(/\$/g, '\\$');

    const cmd = `edge-tts --voice "${voiceName}" --text "${escapedText}" ${rateArg} --write-media "${filepath}"`;

    await execAsync(cmd, { timeout: 60000 });

    const audioBuffer = await readFile(filepath);

    // Cleanup temp file
    await unlink(filepath).catch(() => {});

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.byteLength),
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('TTS audio/speech error:', error);
    return NextResponse.json(
      { error: 'TTS generation failed: ' + String(error) },
      { status: 500 }
    );
  }
}
