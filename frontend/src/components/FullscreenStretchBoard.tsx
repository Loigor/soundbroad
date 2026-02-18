import { useMemo } from 'react';
import { Box, Grid, Button, Stack, Typography, keyframes, Chip } from '@mui/material';
import type { Sample } from '../api/types';
import { getContrastTextColor } from '../utils/colorTheory';
import { PlayStatsDisplay } from './PlayStatsDisplay';

// Blinking animation for when sound is near the end
const blinkAnimation = keyframes`
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0.3; }
`;

// Pulsing glow animation for playing sound
const pulseAnimation = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(144, 202, 249, 0.7),
                inset 0 0 20px rgba(144, 202, 249, 0.3);
  }
  50% {
    box-shadow: 0 0 0 20px rgba(144, 202, 249, 0),
                inset 0 0 30px rgba(144, 202, 249, 0.5);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(144, 202, 249, 0),
                inset 0 0 20px rgba(144, 202, 249, 0.3);
  }
`;

interface FullscreenStretchBoardProps {
  samples: Sample[];
  currentlyPlayingId: string | null;
  onPlay: (sample: Sample) => void;
  onClose: () => void;
  playingPositionSeconds?: number | null;
  playingDurationSeconds?: number | null;
}

export function FullscreenStretchBoard({
  samples,
  currentlyPlayingId,
  onPlay,
  onClose,
  playingPositionSeconds,
  playingDurationSeconds
}: FullscreenStretchBoardProps) {
  // Calculate grid dimensions based on sound count
  // Prefer landscape orientation with more columns than rows
  const { cols, rows } = useMemo(() => {
    const soundCount = samples.length;
    if (soundCount === 0) return { cols: 1, rows: 1 };
    if (soundCount === 1) return { cols: 1, rows: 1 };
    if (soundCount === 2) return { cols: 2, rows: 1 };
    if (soundCount === 3) return { cols: 2, rows: 2 };
    
    // For larger counts, calculate square-ish grid biased towards landscape
    const cols = Math.max(2, Math.ceil(Math.sqrt(soundCount * 1.2)));
    const rows = Math.ceil(soundCount / cols);
    return { cols, rows };
  }, [samples.length]);

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#121212',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1300
      }}
    >
      {/* Close button - top right corner */}
      <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1301 }}>
        <Button variant="contained" onClick={onClose} size="small">
          Exit Stretch
        </Button>
      </Box>

      {/* Main grid area - full bleed */}
      <Box
        sx={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          gap: 0,
          padding: 0,
          overflow: 'hidden'
        }}
      >
        {samples.map((sample) => {
          const isPlaying = currentlyPlayingId === sample.id;
          const duration = playingDurationSeconds ?? (typeof sample.duration_seconds === 'number' ? sample.duration_seconds : 0);
          const position = playingPositionSeconds ?? 0;
          const timeRemaining = duration - position;
          const isNearEnd = isPlaying && timeRemaining > 0 && timeRemaining < 2;

          return (
            <Box
              key={sample.id}
              onClick={() => onPlay(sample)}
              sx={{
                backgroundColor: sample.color || 'rgba(255,255,255,0.04)',
                border:
                  isPlaying
                    ? (theme) => `4px solid ${theme.palette.primary.main}`
                    : '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 3,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                animation: isNearEnd ? `${blinkAnimation} 0.5s infinite` : 'none',
                ...(isPlaying && {
                  animation: isNearEnd ? `${blinkAnimation} 0.5s infinite` : `${pulseAnimation} 2s infinite`
                }),
                '&:hover': {
                  backgroundColor: sample.color
                    ? sample.color
                    : 'rgba(255,255,255,0.08)',
                  transform: 'scale(0.98)',
                  filter: 'brightness(1.1)'
                },
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Play count in top-right corner */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  zIndex: 5
                }}
              >
                <PlayStatsDisplay sampleId={sample.id} />
              </Box>
              {/* Progress bar at the bottom when playing */}
              {isPlaying && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    height: '4px',
                    backgroundColor: 'rgba(144, 202, 249, 0.8)',
                    width: `${duration > 0 ? (position / duration) * 100 : 0}%`,
                    transition: 'width 0.1s linear'
                  }}
                />
              )}

              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: getContrastTextColor(sample.color),
                  marginBottom: 1,
                  wordBreak: 'break-word',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word'
                }}
              >
                {sample.name}
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  color: getContrastTextColor(sample.color),
                  opacity: 0.7,
                  marginBottom: 1,
                  fontSize: '0.9rem'
                }}
              >
                {formatTime(typeof sample.duration_seconds === 'number' ? sample.duration_seconds : 0)}
              </Typography>

              {/* Tags display */}
              {sample.tags.length > 0 && (
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{
                    marginBottom: 1,
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: 0.5
                  }}
                >
                  {sample.tags.slice(0, 3).map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        color: getContrastTextColor(sample.color),
                        fontSize: '0.7rem',
                        height: '20px'
                      }}
                    />
                  ))}
                  {sample.tags.length > 3 && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: getContrastTextColor(sample.color),
                        opacity: 0.6,
                        fontSize: '0.7rem'
                      }}
                    >
                      +{sample.tags.length - 3}
                    </Typography>
                  )}
                </Stack>
              )}

              {isPlaying && (
                <Stack spacing={1.5} sx={{ alignItems: 'center', width: '100%' }}>
                  {/* Animated playing indicator */}
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 0.5,
                      alignItems: 'flex-end',
                      height: '24px'
                    }}
                  >
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Box
                        key={i}
                        sx={{
                          width: '4px',
                          height: `${20 - i * 4}px`,
                          backgroundColor: 'rgba(144, 202, 249, 0.8)',
                          borderRadius: '2px',
                          animation: `${pulseAnimation} 0.8s ease-in-out infinite`,
                          animationDelay: `${i * 0.1}s`
                        }}
                      />
                    ))}
                  </Box>

                  <Typography
                    variant="h6"
                    sx={{
                      color: getContrastTextColor(sample.color),
                      fontWeight: 600,
                      fontSize: '1rem'
                    }}
                  >
                    Playing…
                  </Typography>

                  <Typography
                    variant="body1"
                    sx={{
                      color: getContrastTextColor(sample.color),
                      opacity: 0.8,
                      fontSize: '1rem',
                      fontFamily: 'monospace'
                    }}
                  >
                    {formatTime(position)} / {formatTime(duration)}
                  </Typography>
                </Stack>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function formatTime(seconds: number): string {
  if (!seconds || !Number.isFinite(seconds)) return '0:00';
  const rounded = Math.floor(seconds);
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
