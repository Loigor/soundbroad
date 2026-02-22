/**
 * Get duration of an audio file in seconds
 * Returns a promise that resolves with the duration
 */
export async function getAudioDuration(audioUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    let resolved = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    // Set up event handlers
    const handleLoadedMetadata = () => {
      if (!resolved && audio.duration && Number.isFinite(audio.duration)) {
        resolved = true;
        cleanup();
        console.debug(`[audioUtils] Audio duration loaded: ${audio.duration.toFixed(2)}s from ${audioUrl}`);
        resolve(audio.duration);
      }
    };

    const handleCanPlay = () => {
      // Fallback: if loadedmetadata didn't fire but we can play, try to get duration
      if (!resolved && audio.duration && Number.isFinite(audio.duration)) {
        resolved = true;
        cleanup();
        console.debug(`[audioUtils] Audio duration from canplay: ${audio.duration.toFixed(2)}s from ${audioUrl}`);
        resolve(audio.duration);
      }
    };
    
    const handleError = (e: any) => {
      if (!resolved) {
        resolved = true;
        cleanup();
        const errorMsg = `Failed to load audio from ${audioUrl}: ${e?.message || 'unknown error'}`;
        console.warn(`[audioUtils] ${errorMsg}`);
        reject(new Error(errorMsg));
      }
    };
    
    const cleanup = () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      if (timeoutId) clearTimeout(timeoutId);
      audio.pause();
      audio.src = '';
    };
    
    // Attach event listeners before setting src
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    
    // Enable CORS
    audio.crossOrigin = 'anonymous';
    
    // Set source and preload
    audio.preload = 'metadata';
    audio.src = audioUrl;
    
    // Set up timeout to avoid hanging forever
    timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        const errorMsg = `Timeout loading audio duration from ${audioUrl}`;
        console.warn(`[audioUtils] ${errorMsg}`);
        reject(new Error(errorMsg));
      }
    }, 10000); // Increased timeout to 10 seconds
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
  
  // Filter to only samples without duration
  const samplesNeedingDuration = results.filter(s => !s.duration_seconds || s.duration_seconds === 0);
  
  console.debug(`[audioUtils] populateMissingDurations: ${results.length} total samples`);
  console.debug(`[audioUtils] Samples with duration:`, results.filter(s => s.duration_seconds && s.duration_seconds > 0).map(s => ({ id: s.id, dur: s.duration_seconds })));
  console.debug(`[audioUtils] Samples needing duration: ${samplesNeedingDuration.length}`);
  
  if (samplesNeedingDuration.length === 0) {
    return results;
  }

  console.debug(`[audioUtils] Fetching duration for ${samplesNeedingDuration.length} samples...`);
  
  for (const sample of samplesNeedingDuration) {
    try {
      const audioUrl = getAudioUrl(sample.id);
      console.debug(`[audioUtils] Fetching duration for ${sample.id} from ${audioUrl}`);
      const duration = await getAudioDuration(audioUrl);
      
      // Find the matching sample in results and create a NEW object with updated duration
      const idx = results.findIndex(s => s.id === sample.id);
      if (idx >= 0) {
        // Create new object to trigger React re-render (don't mutate state)
        results[idx] = { ...results[idx], duration_seconds: duration };
        console.debug(`[audioUtils] ✓ Sample ${sample.id}: ${duration.toFixed(2)}s`);
      }
    } catch (error) {
      console.warn(`[audioUtils] ✗ Failed to get duration for sample ${sample.id}:`, error instanceof Error ? error.message : error);
      // Leave duration as null/0 if we can't get it, don't block the rest
    }
  }

  console.debug(`[audioUtils] After fetch, samples with duration:`, results.filter(s => s.duration_seconds && s.duration_seconds > 0).map(s => ({ id: s.id, dur: s.duration_seconds })));
  
  return results;
}
