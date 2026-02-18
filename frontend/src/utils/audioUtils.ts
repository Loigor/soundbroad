/**
 * Get duration of an audio file in seconds
 * Returns a promise that resolves with the duration
 */
export async function getAudioDuration(audioUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    
    // Set up event handlers
    const handleLoadedMetadata = () => {
      cleanup();
      if (audio.duration && Number.isFinite(audio.duration)) {
        resolve(audio.duration);
      } else {
        reject(new Error('Audio duration is invalid or not available'));
      }
    };
    
    const handleError = () => {
      cleanup();
      reject(new Error(`Failed to load audio from ${audioUrl}`));
    };
    
    const handleCanPlay = () => {
      // Fallback: if loadedmetadata didn't fire but we can play, try to get duration
      if (audio.duration && Number.isFinite(audio.duration)) {
        cleanup();
        resolve(audio.duration);
      }
    };
    
    const cleanup = () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.pause();
    };
    
    // Set up timeout to avoid hanging forever
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout loading audio duration'));
    }, 5000);
    
    // Attach event listeners before setting src
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);
    
    // Enable CORS
    audio.crossOrigin = 'anonymous';
    
    // Set source and load
    audio.src = audioUrl;
    audio.load();
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

  console.debug(`[audioUtils] Fetching duration for ${samplesNeedingDuration.length} samples`);
  
  for (const sample of samplesNeedingDuration) {
    try {
      const duration = await getAudioDuration(getAudioUrl(sample.id));
      // Find the matching sample in results and create a NEW object with updated duration
      const idx = results.findIndex(s => s.id === sample.id);
      if (idx >= 0) {
        // Create new object to trigger React re-render (don't mutate state)
        results[idx] = { ...results[idx], duration_seconds: duration };
        console.debug(`[audioUtils] Sample ${sample.id}: ${duration.toFixed(2)}s`);
      }
    } catch (error) {
      console.warn(`[audioUtils] Failed to get duration for sample ${sample.id}:`, error);
      // Leave duration as null/0 if we can't get it, don't block the rest
    }
  }

  console.debug(`[audioUtils] After fetch, samples with duration:`, results.filter(s => s.duration_seconds && s.duration_seconds > 0).map(s => ({ id: s.id, dur: s.duration_seconds })));
  
  return results;
}
