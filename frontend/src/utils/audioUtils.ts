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
      // Be explicit: only resolve if audio.duration is a valid positive number
      const duration = audio.duration;
      if (!resolved && typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
        resolved = true;
        cleanup();
        console.debug(`[audioUtils] Audio duration loaded: ${duration.toFixed(2)}s from ${audioUrl}`);
        resolve(duration);
      } else if (!resolved && audio.readyState > 0) {
        // Log what we got if it's not valid
        console.warn(`[audioUtils] Invalid duration on loadedmetadata: duration=${duration}, readyState=${audio.readyState}, networkState=${audio.networkState}`);
      }
    };

    const handleCanPlay = () => {
      // Fallback: if loadedmetadata didn't fire but we can play, try to get duration
      const duration = audio.duration;
      if (!resolved && typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
        resolved = true;
        cleanup();
        console.debug(`[audioUtils] Audio duration from canplay: ${duration.toFixed(2)}s from ${audioUrl}`);
        resolve(duration);
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
 * Only fetches from audio file if duration_seconds is not already set in the database
 */
export async function populateMissingDurations<T extends { id: string; duration_seconds: number | null }>(
  samples: T[],
  getAudioUrl: (sampleId: string) => string
): Promise<T[]> {
  const results = [...samples];
  
  // Filter to only samples without duration
  // Only try to fetch if duration_seconds is null, undefined, or not a valid number
  // DO NOT include cases where dur === 0 - that might be a valid stored value
  const samplesNeedingDuration = results.filter(s => {
    const dur = s.duration_seconds;
    // Sample needs duration if:
    // - it's null or undefined
    // - it's not a number (shouldn't happen with type safety, but be defensive)
    // - it's NaN or negative
    return dur == null || typeof dur !== 'number' || !Number.isFinite(dur) || dur < 0;
  });
  
  console.debug(`[audioUtils] populateMissingDurations: ${results.length} total samples`);
  console.debug(`[audioUtils] Samples with duration:`, results.filter(s => s.duration_seconds && s.duration_seconds > 0).map(s => ({ id: s.id, dur: s.duration_seconds })));
  console.debug(`[audioUtils] Samples needing duration: ${samplesNeedingDuration.length}`);
  
  if (samplesNeedingDuration.length === 0) {
    console.debug(`[audioUtils] All samples have duration from database, returning as-is`);
    return results;
  }

  console.debug(`[audioUtils] Fetching duration for ${samplesNeedingDuration.length} samples from audio files...`);
  
  for (const sample of samplesNeedingDuration) {
    try {
      const audioUrl = getAudioUrl(sample.id);
      console.debug(`[audioUtils] Fetching duration for ${sample.id} from ${audioUrl}`);
      const duration = await getAudioDuration(audioUrl);
      
      // Only update if we got a valid duration
      if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
        // Find the matching sample in results and create a NEW object with updated duration
        const idx = results.findIndex(s => s.id === sample.id);
        if (idx >= 0) {
          // Create new object to trigger React re-render (don't mutate state)
          results[idx] = { ...results[idx], duration_seconds: duration };
          console.debug(`[audioUtils] ✓ Sample ${sample.id}: ${duration.toFixed(2)}s (from audio file)`);
        }
      } else {
        console.warn(`[audioUtils] Got invalid duration ${duration} for sample ${sample.id}, skipping`);
      }
    } catch (error) {
      console.warn(`[audioUtils] ✗ Failed to get duration for sample ${sample.id}:`, error instanceof Error ? error.message : error);
      // Leave duration as null/0 if we can't get it, don't block the rest
    }
  }

  console.debug(`[audioUtils] After fetch, samples with duration:`, results.filter(s => s.duration_seconds && s.duration_seconds > 0).map(s => ({ id: s.id, dur: s.duration_seconds })));
  
  return results;
}
