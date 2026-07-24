import { type NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';

const execAsync = promisify(exec);
const TTS_DIR = path.join(process.cwd(), 'data', 'tts');

const VOICES: Record<string, string> = {
  default: 'en-US-AriaNeural',
  male: 'en-US-GuyNeural',
  female: 'en-US-JennyNeural',
  british: 'en-GB-SoniaNeural',
  indian: 'en-IN-NeerjaNeural',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voice, speed } = body;

    if (!text) {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }

    // Map voice
    const v = (voice ?? 'male').toLowerCase();
    let voiceName = VOICES.male; // Default: Dr. Tajuddin = male voice
    if (v.includes('female') || v.includes('jenny') || v.includes('aria')) {
      voiceName = VOICES.female;
    } else if (v.includes('neural')) {
      voiceName = voice as string;
    } else if (v in VOICES) {
      voiceName = VOICES[v];
    }

    // Create directory
    await mkdir(TTS_DIR, { recursive: true });
    const filename = `tts-${randomUUID()}.mp3`;
    const filepath = path.join(TTS_DIR, filename);

    // Build rate argument
    const spd = Number(speed ?? 1.0);
    const rateArg = spd > 1.0 ? `--rate "+${Math.round((spd - 1) * 100)}%"` : '';

    // Escape text for shell
    const escapedText = text.substring(0, 3000).replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$');

    const cmd = `edge-tts --voice "${voiceName}" --text "${escapedText}" ${rateArg} --write-media "${filepath}"`;

    await execAsync(cmd, { timeout: 30000 });

    const audioBuffer = await readFile(filepath);

    // Cleanup
    await writeFile(filepath, '').catch(() => {});

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.byteLength),
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('TTS API error:', error);
    return NextResponse.json({ error: 'TTS failed: ' + String(error) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    voices: [
      { voice_id: 'male', name: 'en-US-GuyNeural (Dr. Tajuddin)' },
      { voice_id: 'female', name: 'en-US-JennyNeural' },
      { voice_id: 'default', name: 'en-US-AriaNeural' },
    ],
    engine: 'edge-tts',
  });
}
