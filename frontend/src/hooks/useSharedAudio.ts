import { useRef, useCallback, useState, useEffect } from 'react';

export interface SharedAudioHandle {
  play: (url: string, onProgress?: (progress: number, duration: number) => void, onEnd?: () => void) => void;
  stop: () => void;
  setVolume: (volume: number) => void;
}

/**
 * Custom hook to manage a single shared audio element across the entire app
 * Ensures only one clip can play at a time across different views/pages
 */
export function useSharedAudio(): SharedAudioHandle {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentUrlRef = useRef<string | null>(null);
  const onProgressRef = useRef<((progress: number, duration: number) => void) | null>(null);
  const onEndRef = useRef<(() => void) | null>(null);
  const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize audio element once
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audioRef.current = audio;
    }

    return () => {
      // Cleanup
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

  const play = useCallback((url: string, onProgress?: (progress: number, duration: number) => void, onEnd?: () => void) => {
    const audio = audioRef.current;
    if (!audio) return;

    // Stop any currently playing audio
    audio.pause();
    audio.currentTime = 0;

    // Clear old interval
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
    }

    // Update callbacks
    onProgressRef.current = onProgress || null;
    onEndRef.current = onEnd || null;

    // Set the audio source and play
    audio.src = url;
    currentUrlRef.current = url;

    // Handle ended event
    const handleEnded = () => {
      onEndRef.current?.();
      onProgressRef.current?.(0, 0);
    };

    // Remove old event listeners
    audio.removeEventListener('ended', handleEnded);
    audio.addEventListener('ended', handleEnded);

    // Handle loadedmetadata to get duration
    const handleLoadedMetadata = () => {
      onProgressRef.current?.(audio.currentTime, audio.duration);
    };

    audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    // Start playback
    audio.play().catch(err => {
      console.error('[useSharedAudio] Failed to play audio:', err);
    });

    // Update progress at regular intervals
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
    }
    updateIntervalRef.current = setInterval(() => {
      if (audio.paused || audio.ended) {
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current);
          updateIntervalRef.current = null;
        }
        return;
      }
      onProgressRef.current?.(audio.currentTime, audio.duration);
    }, 100);
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    currentUrlRef.current = null;

    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }

    onProgressRef.current?.(0, 0);
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (audioRef.current) {
      // volume should be normalized (0-1), so no division needed
      audioRef.current.volume = Math.min(1, Math.max(0, volume));
    }
  }, []);

  return { play, stop, setVolume };
}
