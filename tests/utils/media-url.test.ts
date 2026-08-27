import { describe, it, expect } from 'vitest';
import { normalizeMediaUrl, sanitizeClassroomMediaUrls } from '@/lib/utils/media-url';

describe('normalizeMediaUrl', () => {
  it('handles null and undefined', () => {
    expect(normalizeMediaUrl(null)).toBeUndefined();
    expect(normalizeMediaUrl(undefined)).toBeUndefined();
  });

  it('strips http://localhost:3000 prefix from classroom-media URLs', () => {
    expect(
      normalizeMediaUrl('http://localhost:3000/api/classroom-media/ovRYKliCqd/audio/tts_s1.mp3'),
    ).toBe('/api/classroom-media/ovRYKliCqd/audio/tts_s1.mp3');
  });

  it('strips http://127.0.0.1:3000 prefix', () => {
    expect(
      normalizeMediaUrl('http://127.0.0.1:3000/api/classroom-media/ovRYKliCqd/audio/tts_s1.mp3'),
    ).toBe('/api/classroom-media/ovRYKliCqd/audio/tts_s1.mp3');
  });

  it('strips remote domain if pointing to /api/classroom-media/', () => {
    expect(
      normalizeMediaUrl('https://otherdomain.com/api/classroom-media/ovRYKliCqd/videos/scene_1.mp4'),
    ).toBe('/api/classroom-media/ovRYKliCqd/videos/scene_1.mp4');
  });

  it('leaves relative URLs and external S3 URLs intact', () => {
    expect(normalizeMediaUrl('/api/classroom-media/ovRYKliCqd/audio/tts_s1.mp3')).toBe(
      '/api/classroom-media/ovRYKliCqd/audio/tts_s1.mp3',
    );
    expect(normalizeMediaUrl('https://my-bucket.s3.us-east-1.amazonaws.com/media.mp3')).toBe(
      'https://my-bucket.s3.us-east-1.amazonaws.com/media.mp3',
    );
    expect(normalizeMediaUrl('blob:http://localhost:3000/xyz')).toBe(
      'blob:http://localhost:3000/xyz',
    );
  });
});

describe('sanitizeClassroomMediaUrls', () => {
  it('deeply sanitizes nested objects and arrays', () => {
    const input = {
      id: 'stage_1',
      scenes: [
        {
          id: 'scene_1',
          content: {
            type: 'slide',
            canvas: {
              elements: [
                {
                  id: 'el_1',
                  type: 'image',
                  src: 'http://localhost:3000/api/classroom-media/stage_1/images/img_1.png',
                },
                {
                  id: 'el_2',
                  type: 'video',
                  src: 'http://127.0.0.1:3000/api/classroom-media/stage_1/videos/vid_1.mp4',
                  poster: 'http://localhost:3000/api/classroom-media/stage_1/images/poster_1.jpg',
                },
              ],
            },
          },
          actions: [
            {
              id: 'a1',
              type: 'speech',
              text: 'Hello',
              audioUrl: 'http://localhost:3000/api/classroom-media/stage_1/audio/tts_1.mp3',
            },
          ],
        },
      ],
    };

    const sanitized = sanitizeClassroomMediaUrls(input);
    expect(sanitized.scenes[0].actions[0].audioUrl).toBe('/api/classroom-media/stage_1/audio/tts_1.mp3');
    expect((sanitized.scenes[0].content.canvas.elements[0] as any).src).toBe('/api/classroom-media/stage_1/images/img_1.png');
    expect((sanitized.scenes[0].content.canvas.elements[1] as any).src).toBe('/api/classroom-media/stage_1/videos/vid_1.mp4');
    expect((sanitized.scenes[0].content.canvas.elements[1] as any).poster).toBe('/api/classroom-media/stage_1/images/poster_1.jpg');
  });
});
