import { useState } from 'react';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
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
  editMode?: boolean;
  onRemoveFromSoundboard?: (sampleId: string) => void;
  onEditSound?: (sample: Sample) => void;
  onDelete?: (sampleId: string) => Promise<void>;
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
  sequenceMode = false,
  editMode = false,
  onRemoveFromSoundboard,
  onEditSound,
  onDelete
}: SampleGridProps) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [addToSoundboardDialogOpen, setAddToSoundboardDialogOpen] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, sampleId: string) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedSampleId(sampleId);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedSampleId(null);
  };

  const handleOpenAddToSoundboardDialog = () => {
    setAddToSoundboardDialogOpen(true);
    handleMenuClose();
  };

  const handleCloseAddToSoundboardDialog = () => {
    setAddToSoundboardDialogOpen(false);
  };

  const handleAddToGroup = async (groupId: string) => {
    if (selectedSampleId && onAddToGroup) {
      try {
        await onAddToGroup(selectedSampleId, groupId);
        handleCloseAddToSoundboardDialog();
      } catch (error) {
        console.error('Failed to add sample to group:', error);
      }
    }
  };

  const handleEdit = () => {
    if (selectedSampleId) {
      const sample = samples.find(s => s.id === selectedSampleId);
      if (sample) {
        onEditSound?.(sample);
        handleMenuClose();
      }
    }
  };

  const handleDelete = async () => {
    if (selectedSampleId && onDelete) {
      try {
        await onDelete(selectedSampleId);
        handleMenuClose();
      } catch (error) {
        console.error('Failed to delete sample:', error);
      }
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
            {(editMode || groups.length > 0) && (
              <IconButton
                size="small"
                onClick={(e) => handleMenuOpen(e, sample.id)}
                sx={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  zIndex: 10,
                  width: 36,
                  height: 36,
                  padding: 0,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  '&:hover': { backgroundColor: 'rgba(0,0,0,0.5)' },
                  color: 'white',
                  fontSize: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
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
                  gap: 0.95,
                  padding: '1em 1em 1.5em 1em',
                  '&:last-child': { paddingBottom: '12px' },
                  color: getContrastTextColor(sample.color),
                  position: 'relative'
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Tooltip title={sample.name} placement="top-start">
                  <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600 }}>
                    {sample.name}
                  </Typography>
                </Tooltip>
                {/* Duration chip - below waveform */}
                <Chip
                  label={`⏱ ${formatTime(sample.duration_seconds)}`}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(33, 150, 243, 0.4)',
                    border: '1px solid #21242A',
                    '& .MuiChip-label': {
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: getContrastTextColor(sample.color)
                    }
                  }}
                />
                </Box>

                <Box sx={{ position: 'relative', minHeight: 56, display: 'flex', alignItems: 'center' }}>
                  <WaveformPreview
                    audioUrl={`/api/samples/${sample.id}/audio`}
                    isPlaying={currentlyPlayingId === sample.id}
                    currentTime={currentlyPlayingId === sample.id ? playingPositionSeconds : null}
                    duration={currentlyPlayingId === sample.id ? playingDurationSeconds : null}
                    waveColor={getWaveformColor(sample.color)}
                    progressColor={getWaveformColor(sample.color)}
                  />

                  {currentlyPlayingId === sample.id && (
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: '50%',
                        transform: 'translateY(50%)',
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


                {/* Tags in bottom-left corner */}
                {sample.tags.length > 0 && (
                  <Box
                    sx={{
                      bottom: 4,
                      left: 4,
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 0.3,
                      zIndex: 3,
                      margin: '1em 0 0 0'
                    }}
                  >
                    {sample.tags.slice(0, 2).map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        sx={{
                          height: '18px',
                          color: getContrastTextColor(sample.color),
                          '& .MuiChip-label': {
                            fontSize: '0.65rem',
                            padding: '0 4px'
                          }
                        }}
                      />
                    ))}
                    {sample.tags.length > 2 && (
                      <Chip
                        label={`+${sample.tags.length - 2}`}
                        size="small"
                        sx={{
                          height: '18px',
                          color: getContrastTextColor(sample.color),
                          '& .MuiChip-label': {
                            fontSize: '0.65rem',
                            padding: '0 4px'
                          }
                        }}
                      />
                    )}
                  </Box>
                )}

                {/* Play stats in bottom-right corner */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 4,
                    right: 4,
                    zIndex: 5
                  }}
                >
                  <PlayStatsDisplay sampleId={sample.id} />
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
        {onEditSound && <MenuItem onClick={handleEdit}>Edit</MenuItem>}
        {editMode && onRemoveFromSoundboard && (
          <MenuItem onClick={() => {
            if (selectedSampleId) {
              onRemoveFromSoundboard(selectedSampleId);
              handleMenuClose();
            }
          }}>
            Remove from soundboard
          </MenuItem>
        )}
        {onDelete && <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>Delete</MenuItem>}
        {!editMode && groups.length > 0 && (
          <MenuItem onClick={handleOpenAddToSoundboardDialog}>Add to soundboard</MenuItem>
        )}
      </Menu>

      <Dialog open={addToSoundboardDialogOpen} onClose={handleCloseAddToSoundboardDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Add to soundboard</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={1}>
            {groups.map((group) => (
              <MenuItem
                key={group.id}
                onClick={() => handleAddToGroup(group.id)}
                sx={{
                  borderRadius: 1,
                  py: 1,
                  px: 1.5,
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                {group.name}
              </MenuItem>
            ))}
          </Stack>
        </DialogContent>
      </Dialog>
    </Grid>
  );
}

function formatTime(seconds: number | null | undefined): string {
  // Handle null/undefined and ensure it's a number
  const duration = typeof seconds === 'number' ? seconds : 0;
  if (duration <= 0 || !Number.isFinite(duration)) return '0:00';
  const rounded = Math.floor(duration);
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

