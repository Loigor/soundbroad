import type { Sample } from '../api/types';

interface PreloadedAudio {
  id: string;
  audio: HTMLAudioElement;
  preloadedAt: number;
}

class AudioPreloader {
  private preloaded: Map<string, PreloadedAudio> = new Map();
  private maxPreloads = 5; // Limit concurrent preloads on mobile
  private isPreloading = false;
  private enabled = true; // Can be toggled by user

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clear();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async preloadAudio(sampleId: string, audioUrl: string): Promise<HTMLAudioElement> {
    if (!this.enabled) {
      // If preloading is disabled, create and return a new audio element
      const audio = new Audio();
      audio.src = audioUrl;
      return audio;
    }

    // Return if already preloaded
    if (this.preloaded.has(sampleId)) {
      const cached = this.preloaded.get(sampleId)!;
      console.debug(`[AudioPreloader] Using cached audio for ${sampleId}`);
      return cached.audio.cloneNode(true) as HTMLAudioElement;
    }

    // Limit concurrent preloads
    while (this.isPreloading && this.preloaded.size >= this.maxPreloads) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isPreloading = true;
    try {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Preload timeout for ${sampleId}`));
        }, 30000);

        audio.oncanplaythrough = () => {
          clearTimeout(timeout);
          this.preloaded.set(sampleId, {
            id: sampleId,
            audio,
            preloadedAt: Date.now()
          });
          console.debug(`[AudioPreloader] Preloaded ${sampleId}`);
          this.isPreloading = false;
          // Return a clone so the original stays in cache
          resolve(audio.cloneNode(true) as HTMLAudioElement);
        };

        audio.onerror = () => {
          clearTimeout(timeout);
          this.isPreloading = false;
          reject(new Error(`Failed to preload ${sampleId}`));
        };

        audio.src = audioUrl;
      });
    } catch (error) {
      this.isPreloading = false;
      throw error;
    }
  }

  // Preload multiple sounds for a soundboard
  async preloadSoundboard(samples: Sample[]): Promise<void> {
    if (!this.enabled) return;

    console.debug(`[AudioPreloader] Starting preload for ${samples.length} sounds`);
    const toPreload = samples.slice(0, this.maxPreloads);

    await Promise.allSettled(
      toPreload.map(s =>
        this.preloadAudio(s.id, `/api/samples/${s.id}/audio`).catch(err => {
          console.warn(`[AudioPreloader] Failed to preload ${s.id}:`, err.message);
        })
      )
    );
  }

  clear(): void {
    this.preloaded.forEach(({ audio }) => {
      audio.pause();
      audio.src = '';
    });
    this.preloaded.clear();
  }

  getPreloaded(sampleId: string): HTMLAudioElement | null {
    if (!this.enabled) return null;
    const cached = this.preloaded.get(sampleId);
    if (!cached) return null;
    return cached.audio.cloneNode(true) as HTMLAudioElement;
  }

  getStats(): { preloadedCount: number; enabled: boolean } {
    return {
      preloadedCount: this.preloaded.size,
      enabled: this.enabled
    };
  }
}

export const audioPreloader = new AudioPreloader();
