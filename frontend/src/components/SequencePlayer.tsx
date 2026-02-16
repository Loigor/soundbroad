import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  Box,
  Card,
  CardContent,
  IconButton,
  Typography,
  Chip,
  Stack,
  LinearProgress,
  Button,
  keyframes
} from '@mui/material';
import type { Sample } from '../api/types';
import { getContrastTextColor, getWarningColor, getWarningBgColor } from '../utils/colorTheory';

// Blinking animation for end warning
const blinkAnimation = keyframes`
  0%, 49% {
    opacity: 1;
  }
  50%, 100% {
    opacity: 0.3;
  }
`;

export interface SequenceClip {
  id: string;
  sample: Sample;
  sequenceIndex: number;
}

interface SequencePlayerProps {
  clips: SequenceClip[];
  onRemoveClip: (sequenceId: string) => void;
  onClearSequence: () => void;
  volume?: number;
  onProgressChange?: (progress: number, duration: number) => void;
}

export interface SequencePlayerHandle {
  stop: () => void;
}

export const SequencePlayer = forwardRef<SequencePlayerHandle, SequencePlayerProps>(function SequencePlayer(
  {
    clips,
    onRemoveClip,
    onClearSequence,
    volume = 100,
    onProgressChange
  },
  ref
) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentClipIndex, setCurrentClipIndex] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play the next clip in sequence
  useEffect(() => {
    if (!isPlaying || isPaused || clips.length === 0) return;

    // If we need to start the next clip
    if (currentClipIndex === null) {
      // Start with the first clip
      playClipAtIndex(0);
    }
  }, [isPlaying, isPaused, clips]);

  // Handle clip ended - play next one
  useEffect(() => {
    // Cleanup: remove event listeners when component unmounts
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Report progress to parent - for sequence mode, report overall sequence progress
  useEffect(() => {
    if (onProgressChange && clips.length > 0) {
      if (isPlaying) {
        // Calculate cumulative duration of all clips played so far
        let totalPlayedDuration = 0;
        for (let i = 0; i < (currentClipIndex ?? -1); i++) {
          totalPlayedDuration += clips[i].sample.duration_seconds || 0;
        }
        // Add current clip's progress
        if (currentClipIndex !== null) {
          totalPlayedDuration += currentTime;
        }

        // Calculate total sequence duration
        const totalDuration = clips.reduce((sum, clip) => sum + (clip.sample.duration_seconds || 0), 0);

        onProgressChange(totalPlayedDuration, totalDuration);
      } else {
        // Hide progress bar when not playing
        onProgressChange(0, 0);
      }
    }
  }, [currentTime, currentClipIndex, clips, isPlaying, onProgressChange]);

  const playClipAtIndex = (index: number) => {
    if (index < 0 || index >= clips.length) return;

    const clip = clips[index];
    const audio = new Audio(`/api/samples/${clip.sample.id}/audio`);
    audio.volume = volume / 100;

    // Create handlers - note: use the clips and index from closure
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      if (index < clips.length - 1) {
        // Play next clip
        playClipAtIndex(index + 1);
      } else {
        // Sequence finished
        setIsPlaying(false);
        setCurrentClipIndex(null);
        setCurrentTime(0);
      }
    };

    // Attach event listeners before playing
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    audioRef.current = audio;
    setCurrentClipIndex(index);
    setCurrentTime(0);

    audio
      .play()
      .catch((error) => {
        console.error('Failed to play clip:', error);
        setIsPlaying(false);
      });
  };

  const handlePlaySequence = () => {
    if (clips.length === 0) return;

    if (isPaused && audioRef.current) {
      // Resume playback
      audioRef.current.play();
      setIsPaused(false);
      setIsPlaying(true);
    } else if (!isPlaying) {
      // Start from beginning
      setIsPlaying(true);
      playClipAtIndex(0);
    }
  };

  const handlePause = () => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentClipIndex(null);
    setCurrentTime(0);
  };

  // Expose stop method to parent via ref
  useImperativeHandle(ref, () => ({
    stop: handleStop
  }), []);

  const progressPercent =
    duration > 0 ? (currentTime / duration) * 100 : 0;

  // Check if current clip is near the end (within 3 seconds)
  const isClipNearEnd = duration > 0 && (duration - currentTime) < 3;



  if (clips.length === 0) {
    return (
      <Box
        sx={{
          p: 2,
          textAlign: 'center',
          color: 'text.secondary',
          border: '1px dashed rgba(255, 255, 255, 0.2)',
          borderRadius: 1
        }}
      >
        <Typography variant="body2">
          Drag clips here to create a sequence
        </Typography>
      </Box>
    );
  }

  return (
    <Card sx={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <CardContent sx={{ pb: 1 }}>
        <Stack spacing={1.5}>
          {/* Playback Controls */}
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              size="small"
              variant="contained"
              onClick={handlePlaySequence}
              disabled={clips.length === 0}
            >
              ▶ Play
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={handlePause}
              disabled={!isPlaying || clips.length === 0}
            >
              ⏸ Pause
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={handleStop}
              disabled={!isPlaying && !isPaused}
            >
              ⏹ Stop
            </Button>

            {/* Current clip info */}
            {currentClipIndex !== null && (
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {clips[currentClipIndex].sample.name}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </Typography>
              </Box>
            )}

            {/* Clear button */}
            <Button size="small" onClick={onClearSequence}>
              ✕ Clear
            </Button>
          </Stack>

          {/* Progress bar for current clip */}
          {currentClipIndex !== null && (
            <Box sx={{ width: '100%' }}>
              <LinearProgress
                variant="determinate"
                value={progressPercent}
                sx={{ 
                  height: 6, 
                  borderRadius: 2,
                  backgroundColor: isClipNearEnd ? getWarningBgColor(clips[currentClipIndex]?.sample.color) : 'rgba(255, 255, 255, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: isClipNearEnd ? getWarningColor(clips[currentClipIndex]?.sample.color) : 'rgba(33, 150, 243, 0.8)',
                    animation: isClipNearEnd ? `${blinkAnimation} 0.6s infinite` : 'none'
                  }
                }}
              />
            </Box>
          )}

          {/* Sequence chips */}
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.75,
              maxHeight: 120,
              overflowY: 'auto',
              pb: 0.5
            }}
          >
            {clips.map((clip, idx) => (
              <Chip
                key={clip.id}
                label={`${idx + 1}. ${clip.sample.name}`}
                onDelete={() => onRemoveClip(clip.id)}
                size="small"
                sx={{
                  backgroundColor: clip.sample.color || 'rgba(255,255,255,0.1)',
                  color: getContrastTextColor(clip.sample.color),
                  border: currentClipIndex === idx ? '2px solid' : '1px solid rgba(255,255,255,0.2)',
                  borderColor: currentClipIndex === idx ? 'primary.main' : undefined,
                  fontWeight: currentClipIndex === idx ? 600 : 400
                }}
              />
            ))}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
});

function formatTime(seconds: number): string {
  if (!seconds || !Number.isFinite(seconds)) return '0:00';
  const rounded = Math.floor(seconds);
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
