import { useEffect, useState, useRef } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
  Grid
} from '@mui/material';
import { api } from '../api/client';
import type { Sample, SampleGroup, Sequence } from '../api/types';
import { SampleGrid } from '../components/SampleGrid';
import { FullscreenStretchBoard } from '../components/FullscreenStretchBoard';
import { SoundEditDialog } from '../components/SoundEditDialog';
import { SequencePlayer, type SequenceClip, type SequencePlayerHandle } from '../components/SequencePlayer';
import { SaveSequenceDialog } from '../components/SaveSequenceDialog';
import { SavedSequenceCard } from '../components/SavedSequenceCard';
import { recordPlay } from '../utils/playStats';
import { populateMissingDurations } from '../utils/audioUtils';
import { audioPreloader } from '../utils/audioPreloader';

export function SoundboardsView({ volume = 100, audioControlRef, playMode, onProgressChange, enablePreload = true, onPlayModeChange }: { volume?: number; audioControlRef?: React.MutableRefObject<{ stop: () => void } | null>; playMode: 'instant' | 'sequence'; onProgressChange?: (progress: number, duration: number) => void; enablePreload?: boolean; onPlayModeChange?: (mode: 'instant' | 'sequence') => void }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const sequencePlayerRef = useRef<React.ComponentRef<typeof SequencePlayer>>(null);
  const [groups, setGroups] = useState<SampleGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [filteredSamples, setFilteredSamples] = useState<Sample[]>([]);
  const [sequenceClips, setSequenceClips] = useState<SequenceClip[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingSamples, setLoadingSamples] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [positionSeconds, setPositionSeconds] = useState<number | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [fullscreenStretchMode, setFullscreenStretchMode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingSoundId, setEditingSoundId] = useState<string | null>(null);
  const [soundboardsDrawerOpen, setSoundboardsDrawerOpen] = useState(false);
  const [addSoundSearchQuery, setAddSoundSearchQuery] = useState('');
  const [addSoundSearchResults, setAddSoundSearchResults] = useState<Sample[]>([]);
  const [loadingAddSounds, setLoadingAddSounds] = useState(false);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loadingSequences, setLoadingSequences] = useState(false);
  const [saveSequenceDialogOpen, setSaveSequenceDialogOpen] = useState(false);
  const [loadedSequenceId, setLoadedSequenceId] = useState<string | null>(null);

  useEffect(() => {
    setLoadingGroups(true);
    api
      .get<SampleGroup[]>('/api/sample-groups')
      .then((res) => setGroups(res.data))
      .finally(() => setLoadingGroups(false));
  }, []);

  useEffect(() => {
    if (!selectedGroupId) {
      setSamples([]);
      setFilteredSamples([]);
      return;
    }
    setLoadingSamples(true);
    api
      .get<Sample[]>('/api/samples', { params: { groupId: selectedGroupId } })
      .then((res) => populateMissingDurations(res.data, (id) => `/api/samples/${id}/audio`))
      .then((samplesWithDuration) => {
        setSamples(samplesWithDuration);
        // Preload sounds for this soundboard if enabled
        if (enablePreload) {
          audioPreloader.preloadSoundboard(samplesWithDuration).catch(err => {
            console.warn('[SoundboardsView] Preload failed:', err);
          });
        }
        return samplesWithDuration;
      })
      .finally(() => setLoadingSamples(false));
  }, [selectedGroupId, enablePreload]);

  useEffect(() => {
    if (!selectedGroupId) {
      setSequences([]);
      return;
    }
    setLoadingSequences(true);
    api
      .get<Sequence[]>(`/api/sample-groups/${selectedGroupId}/sequences`)
      .then((res) => setSequences(res.data))
      .catch(err => {
        console.error('Failed to load sequences:', err);
        setSequences([]);
      })
      .finally(() => setLoadingSequences(false));
  }, [selectedGroupId]);

  useEffect(() => {
    const query = searchQuery.toLowerCase();
    if (!query) {
      setFilteredSamples(samples);
      return;
    }
    const filtered = samples.filter((sample) => {
      const nameMatch = sample.name.toLowerCase().includes(query);
      const tagMatch = sample.tags.some((tag) => tag.toLowerCase().includes(query));
      return nameMatch || tagMatch;
    });
    setFilteredSamples(filtered);
  }, [samples, searchQuery]);

  // Update volume for currently playing audio
  useEffect(() => {
    if (audio && currentlyPlayingId) {
      audio.volume = volume / 100;
    }
  }, [volume, audio, currentlyPlayingId]);

  // Update playback progress in parent
  useEffect(() => {
    if (playMode === 'instant') {
      if (currentlyPlayingId && positionSeconds !== null && durationSeconds !== null && onProgressChange) {
        onProgressChange(positionSeconds, durationSeconds);
      } else if (!currentlyPlayingId && onProgressChange) {
        // Hide progress bar when no clip is playing
        onProgressChange(0, 0);
      }
    }
  }, [positionSeconds, durationSeconds, currentlyPlayingId, playMode, onProgressChange]);

  // Set up audio control ref for parent to stop playback (both instant and sequence modes)
  useEffect(() => {
    if (audioControlRef) {
      audioControlRef.current = {
        stop: () => {
          if (playMode === 'sequence') {
            // Stop sequence
            sequencePlayerRef.current?.stop();
          } else {
            // Stop instant playback
            if (audio) {
              audio.pause();
              audio.currentTime = 0;
              setCurrentlyPlayingId(null);
              setPositionSeconds(0);
            }
          }
        }
      };
    }
  }, [audio, audioControlRef, playMode]);

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    api
      .post<SampleGroup>('/api/sample-groups', { name: newGroupName.trim() })
      .then((res) => {
        setGroups((prev) => [res.data, ...prev]);
        setSelectedGroupId(res.data.id);
        setNewGroupName('');
        setCreatingGroup(false);
      })
      .catch(() => {
        // keep simple for now; could add error handling UI
      });
  };

  const handleAddToGroup = async (sampleId: string, groupId: string) => {
    try {
      await api.post(`/api/sample-groups/${groupId}/samples`, { sampleId });
      // Reload samples for the group if it's currently selected
      if (groupId === selectedGroupId) {
        const res = await api.get<Sample[]>('/api/samples', { params: { groupId } });
        setSamples(res.data);
      }
    } catch (error) {
      console.error('Failed to add sample to group:', error);
    }
  };

  const handleAddToSequence = (sample: Sample) => {
    const newClip: SequenceClip = {
      id: `${sample.id}-${Date.now()}`,
      sample,
      sequenceIndex: sequenceClips.length
    };
    setSequenceClips((prev) => [...prev, newClip]);
  };

  const handleRemoveFromSequence = (sequenceId: string) => {
    setSequenceClips((prev) => prev.filter((clip) => clip.id !== sequenceId));
  };

  const handleClearSequence = () => {
    setSequenceClips([]);
    setLoadedSequenceId(null);
  };

  const handlePlay = (sample: Sample) => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    
    // Try to use preloaded audio if available
    let newAudio = audioPreloader.getPreloaded(sample.id);
    
    if (!newAudio) {
      newAudio = new Audio(`/api/samples/${sample.id}/audio`);
    }
    
    newAudio.volume = volume / 100;
    newAudio.onloadedmetadata = () => {
      setDurationSeconds(newAudio.duration || sample.duration_seconds || null);
    };
    newAudio.ontimeupdate = () => {
      setPositionSeconds(newAudio.currentTime);
    };
    newAudio.onended = () => {
      setCurrentlyPlayingId(null);
      setPositionSeconds(0);
    };
    setAudio(newAudio);
    setCurrentlyPlayingId(sample.id);
    recordPlay(sample.id);
    void newAudio.play();
  };

  const handleRemoveFromSoundboard = async (sampleId: string) => {
    if (!selectedGroupId) return;
    try {
      await api.delete(`/api/sample-groups/${selectedGroupId}/samples/${sampleId}`);
      setSamples((prev) => prev.filter((s) => s.id !== sampleId));
    } catch (err) {
      console.error('Failed to remove sound from soundboard:', err);
    }
  };

  const handleAddToBoard = async (sampleId: string) => {
    if (!selectedGroupId) return;
    try {
      await api.post(`/api/sample-groups/${selectedGroupId}/samples/${sampleId}`, {});
      // Reload samples
      setLoadingSamples(true);
      const res = await api.get<Sample[]>('/api/samples', { params: { groupId: selectedGroupId } });
      const samplesWithDuration = await populateMissingDurations(res.data, (id) => `/api/samples/${id}/audio`);
      setSamples(samplesWithDuration);
      setAddSoundSearchQuery('');
      setAddSoundSearchResults([]);
    } catch (err) {
      console.error('Failed to add sound to soundboard:', err);
    } finally {
      setLoadingSamples(false);
    }
  };

  const handleSearchAddSounds = async (query: string) => {
    setAddSoundSearchQuery(query);
    if (query.length < 2 || !selectedGroupId) {
      setAddSoundSearchResults([]);
      return;
    }
    setLoadingAddSounds(true);
    try {
      const res = await api.get<Sample[]>('/api/samples', { params: { search: query } });
      // Filter out sounds already in the soundboard
      const notInBoard = res.data.filter((s) => !samples.find((sample) => sample.id === s.id));
      setAddSoundSearchResults(notInBoard);
    } catch (err) {
      console.error('Failed to search sounds:', err);
    } finally {
      setLoadingAddSounds(false);
    }
  };

  const handleSoundUpdated = (updatedSound: Sample) => {
    setSamples((prev) =>
      prev.map((s) => (s.id === updatedSound.id ? updatedSound : s))
    );
    setEditingSoundId(null);
  };

  const handleSoundDeleted = (soundId: string) => {
    setSamples((prev) => prev.filter((s) => s.id !== soundId));
    setEditingSoundId(null);
  };

  const handleDeleteSample = async (sampleId: string) => {
    if (!window.confirm('Are you sure you want to delete this sound? This action cannot be undone.')) {
      return;
    }
    try {
      await api.delete(`/api/samples/${sampleId}`);
      setSamples((prev) => prev.filter(s => s.id !== sampleId));
    } catch (error) {
      console.error('Failed to delete sample:', error);
    }
  };

  const handleDeleteSoundboard = async () => {
    if (!selectedGroupId) return;
    if (!window.confirm('Are you sure you want to delete this soundboard? This action cannot be undone.')) {
      return;
    }
    try {
      await api.delete(`/api/sample-groups/${selectedGroupId}`);
      setGroups((prev) => prev.filter((g) => g.id !== selectedGroupId));
      setSelectedGroupId(null);
      setSamples([]);
      setFilteredSamples([]);
    } catch (err) {
      console.error('Failed to delete soundboard:', err);
    }
  };

  const handleSaveSequence = async () => {
    if (!selectedGroupId) return;
    setLoadingSequences(true);
    try {
      const res = await api.get<Sequence[]>(`/api/sample-groups/${selectedGroupId}/sequences`);
      setSequences(res.data);
      // Clear loaded sequence ID after successful save so we're ready for next save
      setLoadedSequenceId(null);
    } catch (err) {
      console.error('Failed to reload sequences:', err);
    } finally {
      setLoadingSequences(false);
    }
  };

  const handleLoadSequence = (sequence: Sequence) => {
    // Switch to sequence mode if currently in instant mode
    if (playMode === 'instant' && onPlayModeChange) {
      onPlayModeChange('sequence');
    }

    // Convert saved sequence format to SequenceClip format used by SequencePlayer
    const clips = sequence.sequence_data
      .map((clip, index) => {
        const sample = samples.find(s => s.id === clip.sampleId);
        if (!sample) return null;
        return {
          id: `${clip.sampleId}-${index}`,
          sample,
          sequenceIndex: index
        };
      })
      .filter((clip): clip is SequenceClip => clip !== null);
    
    setSequenceClips(clips);
    setLoadedSequenceId(sequence.id);
  };

  const handlePlayLoadedSequence = () => {
    // Trigger playback of already-loaded clips
    setTimeout(() => {
      if (sequencePlayerRef.current) {
        sequencePlayerRef.current.play();
      }
    }, 50);
  };

  const handlePlaySequence = (sequence: Sequence) => {
    handleLoadSequence(sequence);
    handlePlayLoadedSequence();
  };

  const handleDeleteSequence = async (sequenceId: string) => {
    if (!selectedGroupId) return;
    if (!window.confirm('Delete this saved sequence?')) {
      return;
    }
    try {
      await api.delete(`/api/sample-groups/${selectedGroupId}/sequences/${sequenceId}`);
      setSequences((prev) => prev.filter((s) => s.id !== sequenceId));
    } catch (err) {
      console.error('Failed to delete sequence:', err);
    }
  };

  return (
    <>
      {fullscreenStretchMode && selectedGroupId && (
        <FullscreenStretchBoard
          samples={filteredSamples}
          currentlyPlayingId={currentlyPlayingId}
          onPlay={handlePlay}
          onClose={() => setFullscreenStretchMode(false)}
          playingPositionSeconds={positionSeconds}
          playingDurationSeconds={durationSeconds}
        />
      )}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ height: '100%' }}>
        {/* Desktop sidebar - always visible on desktop, hidden on mobile */}
        {!fullscreenStretchMode && !isMobile && (
          <Box
            sx={{
              width: 260,
              flexShrink: 0,
              borderRight: '1px solid rgba(255,255,255,0.08)',
              pr: 2,
              overflow: 'auto'
            }}
          >
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Soundboards
          </Typography>
          <Button size="small" variant="outlined" onClick={() => setCreatingGroup(true)}>
            New
          </Button>
        </Stack>
        {loadingGroups ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <List dense>
            {groups.map((g) => (
              <ListItemButton
                key={g.id}
                selected={g.id === selectedGroupId}
                onClick={() => setSelectedGroupId(g.id)}
              >
                <ListItemText primary={g.name} />
              </ListItemButton>
            ))}
            {groups.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 1 }}>
                No soundboards yet. Create one to get started.
              </Typography>
            )}
          </List>
        )}
        </Box>
      )}

      {/* Mobile sidebar drawer */}
      <Drawer
        anchor="left"
        open={soundboardsDrawerOpen}
        onClose={() => setSoundboardsDrawerOpen(false)}
      >
        <Box sx={{ width: 280, pt: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1} px={2}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Soundboards
            </Typography>
            <Button size="small" variant="outlined" onClick={() => setCreatingGroup(true)}>
              New
            </Button>
          </Stack>
          {loadingGroups ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <List dense>
              {groups.map((g) => (
                <ListItemButton
                  key={g.id}
                  selected={g.id === selectedGroupId}
                  onClick={() => {
                    setSelectedGroupId(g.id);
                    setSoundboardsDrawerOpen(false);
                  }}
                >
                  <ListItemText primary={g.name} />
                </ListItemButton>
              ))}
              {groups.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, ml: 1 }}>
                  No soundboards yet. Create one to get started.
                </Typography>
              )}
            </List>
          )}
        </Box>
      </Drawer>

      <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {!selectedGroupId ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2
            }}
          >
            <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
              Select a soundboard or create a new one.
            </Typography>
            {isMobile && groups.length > 0 && (
              <Button
                variant="outlined"
                onClick={() => setSoundboardsDrawerOpen(true)}
                fullWidth={isSmallMobile}
                sx={{ maxWidth: 300 }}
              >
                Open Soundboards
              </Button>
            )}
          </Box>
        ) : loadingSamples ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <>
            {playMode === 'sequence' && (
              <SequencePlayer
                ref={sequencePlayerRef}
                clips={sequenceClips}
                onRemoveClip={handleRemoveFromSequence}
                onClearSequence={handleClearSequence}
                volume={volume}
                onProgressChange={onProgressChange}
              />
            )}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, alignItems: { xs: 'stretch', sm: 'center' } }}>
              {isMobile && (
                <Button
                  variant="outlined"
                  onClick={() => setSoundboardsDrawerOpen(true)}
                  fullWidth={isSmallMobile}
                >
                  Soundboards
                </Button>
              )}
              <TextField
                size="small"
                placeholder="Search sounds by name or tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ flex: 1, maxWidth: { xs: '100%', sm: 400 } }}
              />
              {editMode && (
                <TextField
                  size="small"
                  placeholder="Search to add sounds..."
                  value={addSoundSearchQuery}
                  onChange={(e) => handleSearchAddSounds(e.target.value)}
                  sx={{ flex: 1, maxWidth: { xs: '100%', sm: 400 } }}
                />
              )}
              <Button
                size="small"
                variant={editMode ? 'contained' : 'outlined'}
                onClick={() => {
                  setEditMode(!editMode);
                  setAddSoundSearchQuery('');
                  setAddSoundSearchResults([]);
                }}
                fullWidth={isSmallMobile}
              >
                {editMode ? 'Edit: On' : 'Edit'}
              </Button>
              {editMode && (
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={handleDeleteSoundboard}
                  fullWidth={isSmallMobile}
                >
                  Delete
                </Button>
              )}
              <Button
                size="small"
                variant="contained"
                onClick={() => setFullscreenStretchMode(true)}
                fullWidth={isSmallMobile}
              >
                {isSmallMobile ? 'Fullscreen' : 'Full Screen Stretch'}
              </Button>
              {playMode === 'sequence' && sequenceClips.length > 0 && (
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  onClick={() => setSaveSequenceDialogOpen(true)}
                  fullWidth={isSmallMobile}
                >
                  Save Sequence
                </Button>
              )}
            </Stack>

            {editMode && addSoundSearchResults.length > 0 && (
              <Box sx={{ mb: 2, p: 1.5, backgroundColor: 'rgba(33, 150, 243, 0.08)', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                  Search Results ({addSoundSearchResults.length})
                </Typography>
                <Stack spacing={1}>
                  {addSoundSearchResults.map((sound) => (
                    <Box
                      key={sound.id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 1,
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        borderRadius: 0.5
                      }}
                    >
                      <Typography variant="body2">{sound.name}</Typography>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleAddToBoard(sound.id)}
                      >
                        Add
                      </Button>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}

            <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
              {/* Saved Sequences Section */}
              {sequences.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                    Saved Sequences ({sequences.length})
                  </Typography>
                  <Grid container spacing={2}>
                    {sequences.map((sequence) => {
                      const samplesMap = new Map(samples.map(s => [s.id, s]));
                      return (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={sequence.id}>
                          <SavedSequenceCard
                            sequence={sequence}
                            onLoad={() => handleLoadSequence(sequence)}
                            onPlay={() => handlePlaySequence(sequence)}
                            onDelete={() => handleDeleteSequence(sequence.id)}
                            samples={samplesMap}
                          />
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>
              )}

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                Sounds
              </Typography>
              <SampleGrid
                samples={filteredSamples}
                currentlyPlayingId={currentlyPlayingId}
                onPlay={playMode === 'sequence' ? handleAddToSequence : handlePlay}
                playingPositionSeconds={positionSeconds}
                playingDurationSeconds={durationSeconds}
                editMode={editMode}
                onRemoveFromSoundboard={handleRemoveFromSoundboard}
                onEditSound={(sound) => setEditingSoundId(sound.id)}
                onDelete={handleDeleteSample}
                sequenceMode={playMode === 'sequence'}
              />
            </Box>
          </>
        )}
      </Box>

      </Stack>

      {editingSoundId && (
        <SoundEditDialog
          sound={samples.find((s) => s.id === editingSoundId) || null}
          open={!!editingSoundId}
          onClose={() => setEditingSoundId(null)}
          onSave={handleSoundUpdated}
          onDelete={handleSoundDeleted}
        />
      )}

      <Dialog open={creatingGroup} onClose={() => setCreatingGroup(false)} fullWidth maxWidth="xs">
        <DialogTitle>Create soundboard</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            variant="outlined"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreatingGroup(false)}>Cancel</Button>
          <Button onClick={handleCreateGroup} variant="contained" disabled={!newGroupName.trim()}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {selectedGroupId && (
        <SaveSequenceDialog
          open={saveSequenceDialogOpen}
          onClose={() => setSaveSequenceDialogOpen(false)}
          onSave={handleSaveSequence}
          sequenceClips={sequenceClips}
          soundboardId={selectedGroupId}
          loadedSequenceId={loadedSequenceId}
          loadedSequenceName={sequences.find(s => s.id === loadedSequenceId)?.name}
        />
      )}
    </>
  );
}

