import { useState } from 'react';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Typography
} from '@mui/material';
import type { Sample, SampleGroup } from '../api/types';
import { WaveformPreview } from './WaveformPreview';
import { PlayStatsDisplay } from './PlayStatsDisplay';
import { getContrastTextColor, getWaveformColor } from '../utils/colorTheory';

export interface SampleGridProps {
  samples: Sample[];
  currentlyPlayingId: string | null;
  onPlay: (sample: Sample) => void;
  playingPositionSeconds?: number | null;
  playingDurationSeconds?: number | null;
  groups?: SampleGroup[];
  onAddToGroup?: (sampleId: string, groupId: string) => Promise<void>;
  scaleMode?: boolean;
  sequenceMode?: boolean;
}

export function SampleGrid({
  samples,
  currentlyPlayingId,
  onPlay,
  playingPositionSeconds,
  playingDurationSeconds,
  groups = [],
  onAddToGroup,
  scaleMode = false,
  sequenceMode = false
}: SampleGridProps) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, sampleId: string) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedSampleId(sampleId);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedSampleId(null);
  };

  const handleAddToGroup = async (groupId: string) => {
    if (selectedSampleId && onAddToGroup) {
      try {
        await onAddToGroup(selectedSampleId, groupId);
        handleMenuClose();
      } catch (error) {
        console.error('Failed to add sample to group:', error);
      }
    }
  };

  // Helper function to determine if a color is light or dark
  const isLightColor = (color: string | null | undefined): boolean => {
    if (!color) return false;
    
    // Parse hex color
    const hex = color.replace('#', '');
    if (hex.length !== 6) return false;
    
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  };

  // Get text color based on background
  const getTextColor = (bgColor: string | null | undefined): string => {
    return isLightColor(bgColor) ? 'rgba(0, 0, 0, 0.87)' : 'rgba(255, 255, 255, 0.87)';
  };

  // Get progress indicator color - use contrasting color
  const getProgressColor = (bgColor: string | null | undefined): string => {
    const light = isLightColor(bgColor);
    if (light) {
      return 'rgba(0, 0, 0, 0.7)'; // Dark on light
    } else {
      return 'rgba(255, 255, 255, 0.9)'; // White on dark or default gray
    }
  };

  return (
    <Grid container spacing={2}>
      {samples.map((sample) => {
        // Calculate responsive columns based on scaleMode
        // In fullscreen mode, use more columns to fill the screen
        let gridProps: any = { xs: 6, sm: 4, md: 3, lg: 2.4 };
        if (scaleMode) {
          gridProps = { xs: 4, sm: 3, md: 2.4, lg: 2 };
        }
        return (
          <Grid item {...gridProps} key={sample.id}>
          <Card
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              border:
                currentlyPlayingId === sample.id
                  ? (theme) => `2px solid ${theme.palette.primary.main}`
                  : '1px solid rgba(255,255,255,0.08)',
              backgroundColor: sample.color || 'rgba(255,255,255,0.04)',
              position: 'relative'
            }}
          >
            {groups.length > 0 && (
              <IconButton
                size="small"
                onClick={(e) => handleMenuOpen(e, sample.id)}
                sx={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  zIndex: 10,
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  '&:hover': { backgroundColor: 'rgba(0,0,0,0.5)' },
                  color: 'white',
                  fontSize: '18px'
                }}
              >
                ⋯
              </IconButton>
            )}
            <CardActionArea
              onClick={() => onPlay(sample)}
              sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
            >
              <CardContent
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.75,
                  padding: '12px',
                  '&:last-child': { paddingBottom: '12px' },
                  color: getContrastTextColor(sample.color)
                }}
              >
                <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600 }}>
                  {sample.name}
                </Typography>

                <Box sx={{ position: 'relative', minHeight: 56, display: 'flex', alignItems: 'center' }}>
                  <WaveformPreview 
                    audioUrl={`/api/samples/${sample.id}/audio`}
                    isPlaying={currentlyPlayingId === sample.id}
                    currentTime={currentlyPlayingId === sample.id ? playingPositionSeconds : null}
                    duration={currentlyPlayingId === sample.id ? playingDurationSeconds : null}
                    progressColor={getProgressColor(sample.color)}
                  />
                  
                  {currentlyPlayingId === sample.id && (
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-end',
                        px: 1,
                        py: 0.5,
                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                        backdropFilter: 'blur(2px)',
                        borderRadius: '0 0 4px 4px',
                        zIndex: 10
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ 
                          fontWeight: 500,
                          color: 'rgba(255, 255, 255, 0.9)'
                        }}
                      >
                        Playing…
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: 'rgba(255, 255, 255, 0.7)',
                          fontSize: '0.7rem'
                        }}
                      >
                        {formatTime(playingPositionSeconds ?? 0)} /{' '}
                        {formatTime(
                          playingDurationSeconds ??
                            (typeof sample.duration_seconds === 'number'
                              ? sample.duration_seconds
                              : 0)
                        )}
                      </Typography>
                    </Box>
                  )}
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                  {sample.tags.slice(0, 3).map((tag) => (
                    <Chip key={tag} label={tag} size="small" />
                  ))}
                  {sample.tags.length > 3 && (
                    <Chip label={`+${sample.tags.length - 3}`} size="small" />
                  )}
                  <Chip 
                    label={`⏱ ${formatTime(sample.duration_seconds || 0)}`} 
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(33, 150, 243, 0.2)',
                      '& .MuiChip-label': {
                        fontSize: '0.75rem',
                        fontWeight: 500
                      }
                    }}
                  />
                  <Box sx={{ ml: 'auto' }}>
                    <PlayStatsDisplay sampleId={sample.id} />
                  </Box>
                </Box>
              </CardContent>
            </CardActionArea>
          </Card>
          </Grid>
        );
      })}

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        {groups.map((group) => (
          <MenuItem key={group.id} onClick={() => handleAddToGroup(group.id)}>
            Add to {group.name}
          </MenuItem>
        ))}
      </Menu>
    </Grid>
  );
}

function formatTime(seconds: number): string {
  if (!seconds || !Number.isFinite(seconds)) return '0:00';
  const rounded = Math.floor(seconds);
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

