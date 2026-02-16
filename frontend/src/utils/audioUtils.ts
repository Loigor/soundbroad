/**
 * Get duration of an audio file in seconds
 * Returns a promise that resolves with the duration
 */
export async function getAudioDuration(audioUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.onloadedmetadata = () => {
      resolve(audio.duration);
    };
    audio.onerror = () => {
      reject(new Error('Failed to load audio metadata'));
    };
    audio.src = audioUrl;
  });
}

/**
 * Populate duration for samples that don't have it
 * Modifies samples in place and returns the modified array
 */
export async function populateMissingDurations<T extends { id: string; duration_seconds: number | null }>(
  samples: T[],
  getAudioUrl: (sampleId: string) => string
): Promise<T[]> {
  const results = [...samples];
  
  for (let i = 0; i < results.length; i++) {
    if (!results[i].duration_seconds) {
      try {
        const duration = await getAudioDuration(getAudioUrl(results[i].id));
        results[i].duration_seconds = duration;
      } catch (error) {
        console.warn(`Failed to get duration for sample ${results[i].id}:`, error);
        // Leave duration as null if we can't get it
      }
    }
  }
  
  return results;
}
