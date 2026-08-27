/**
 * Audio Player - Audio player interface
 *
 * Handles audio playback, pause, stop, and other operations
 * Loads pre-generated TTS audio files from IndexedDB
 *
 */

import { db } from '@/lib/utils/database';
import { createLogger } from '@/lib/logger';
import { normalizeMediaUrl } from '@/lib/utils/media-url';

const log = createLogger('AudioPlayer');

/**
 * Audio player implementation
 */
export class AudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private onEndedCallback: (() => void) | null = null;
  private muted: boolean = false;
  private volume: number = 1;
  private playbackRate: number = 1;
  private requestToken: number = 0;

  private stopAudioElement(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
    }
  }

  /**
   * Play audio (from URL or IndexedDB pre-generated cache)
   * @param audioId Audio ID
   * @param audioUrl Optional server-generated audio URL (takes priority over IndexedDB)
   * @returns true if audio started playing, false if no audio (TTS disabled or not generated)
   */
  public async play(audioId: string, audioUrl?: string): Promise<boolean> {
    const requestToken = ++this.requestToken;
    try {
      // 1. Try audioUrl first (server-generated TTS)
      const normalizedUrl = normalizeMediaUrl(audioUrl);
      if (normalizedUrl) {
        try {
          this.stopAudioElement();
          if (requestToken !== this.requestToken) return false;
          this.audio = new Audio();
          this.audio.src = normalizedUrl;
          if (this.muted) this.audio.volume = 0;
          else this.audio.volume = this.volume;
          this.audio.defaultPlaybackRate = this.playbackRate;
          this.audio.playbackRate = this.playbackRate;
          this.audio.addEventListener('ended', () => {
            this.onEndedCallback?.();
          });
          await this.audio.play();
          if (requestToken !== this.requestToken) return false;
          this.audio.playbackRate = this.playbackRate;
          return true;
        } catch (urlPlayError) {
          log.warn('Direct audioUrl playback failed, falling back:', urlPlayError);
        }
      }

      // 2. Try IndexedDB (client-generated TTS)
      const audioRecord = audioId ? await db.audioFiles.get(audioId) : null;
      if (requestToken !== this.requestToken) return false;

      if (audioRecord) {
        // Stop current playback
        this.stopAudioElement();
        if (requestToken !== this.requestToken) return false;

        // Create audio element
        this.audio = new Audio();

        // Set audio source
        const blobUrl = URL.createObjectURL(audioRecord.blob);
        this.audio.src = blobUrl;
        if (this.muted) this.audio.volume = 0;
        else this.audio.volume = this.volume;

        // Apply playback rate
        this.audio.defaultPlaybackRate = this.playbackRate;
        this.audio.playbackRate = this.playbackRate;

        // Set ended callback
        this.audio.addEventListener('ended', () => {
          URL.revokeObjectURL(blobUrl);
          this.onEndedCallback?.();
        });

        try {
          await this.audio.play();
        } catch (playError) {
          URL.revokeObjectURL(blobUrl);
          throw playError;
        }
        if (requestToken !== this.requestToken) {
          URL.revokeObjectURL(blobUrl);
          return false;
        }
        this.audio.playbackRate = this.playbackRate;
        return true;
      }

      // 3. Fall back to server classroom-media endpoint if audioId is present
      if (audioId && typeof window !== 'undefined') {
        const classroomMatch = window.location.pathname.match(/\/classroom\/([^/]+)/);
        const classroomId = classroomMatch?.[1];
        if (classroomId) {
          const fallbackUrl = `/api/classroom-media/${classroomId}/audio/${audioId}.mp3`;
          try {
            this.stopAudioElement();
            if (requestToken !== this.requestToken) return false;
            this.audio = new Audio();
            this.audio.src = fallbackUrl;
            if (this.muted) this.audio.volume = 0;
            else this.audio.volume = this.volume;
            this.audio.defaultPlaybackRate = this.playbackRate;
            this.audio.playbackRate = this.playbackRate;
            this.audio.addEventListener('ended', () => {
              this.onEndedCallback?.();
            });
            await this.audio.play();
            if (requestToken !== this.requestToken) return false;
            this.audio.playbackRate = this.playbackRate;
            return true;
          } catch {
            // Skip silently if server fallback also does not exist
          }
        }
      }

      return false;
    } catch (error) {
      log.error('Failed to play audio:', error);
      throw error;
    }
  }

  /**
   * Pause playback
   */
  public pause(): void {
    this.requestToken += 1;
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
    }
  }

  /**
   * Stop playback
   */
  public stop(): void {
    this.requestToken += 1;
    this.stopAudioElement();
    // Note: onEndedCallback intentionally NOT cleared here because play()
    // calls stop() internally — clearing would break the callback chain.
    // Stale callbacks are harmless: engine mode check prevents processNext().
  }

  /**
   * Resume playback
   */
  public resume(): void {
    if (this.audio?.paused) {
      this.audio.playbackRate = this.playbackRate;
      this.audio.play().catch((error) => {
        log.error('Failed to resume audio:', error);
      });
    }
  }

  /**
   * Get current playback status (actively playing, not paused)
   */
  public isPlaying(): boolean {
    return this.audio !== null && !this.audio.paused;
  }

  /**
   * Whether there is active audio (playing or paused, but not ended)
   * Used to decide whether to resume playback or skip to the next line
   */
  public hasActiveAudio(): boolean {
    return this.audio !== null;
  }

  /**
   * Get current playback time (milliseconds)
   */
  public getCurrentTime(): number {
    return this.audio ? this.audio.currentTime * 1000 : 0;
  }

  /**
   * Get audio duration (milliseconds)
   */
  public getDuration(): number {
    return this.audio && !isNaN(this.audio.duration) ? this.audio.duration * 1000 : 0;
  }

  /**
   * Seek to a specific position (milliseconds)
   */
  public seek(ms: number): void {
    if (this.audio) {
      try {
        this.audio.currentTime = Math.max(0, ms / 1000);
      } catch {
        // Seeking can fail if metadata not loaded yet — ignore
      }
    }
  }

  /**
   * Set playback ended callback
   */
  public onEnded(callback: () => void): void {
    this.onEndedCallback = callback;
  }

  /**
   * Set mute state (takes effect immediately on currently playing audio)
   */
  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.audio) {
      this.audio.volume = muted ? 0 : this.volume;
    }
  }

  /**
   * Set volume (0-1)
   */
  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.audio && !this.muted) {
      this.audio.volume = this.volume;
    }
  }

  /**
   * Set playback speed (takes effect immediately on currently playing audio)
   */
  public setPlaybackRate(rate: number): void {
    this.playbackRate = Math.max(0.5, Math.min(2, rate));
    if (this.audio) {
      this.audio.playbackRate = this.playbackRate;
    }
  }

  /**
   * Destroy the player
   */
  public destroy(): void {
    this.stop();
    this.onEndedCallback = null;
  }
}

/**
 * Create an audio player instance
 */
export function createAudioPlayer(): AudioPlayer {
  return new AudioPlayer();
}
