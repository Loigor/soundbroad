import { useEffect, useState, useRef } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { api } from '../api/client';
import type { Sample, SampleGroup } from '../api/types';
import { SampleGrid } from '../components/SampleGrid';
import { SequencePlayer, type SequenceClip, type SequencePlayerHandle } from '../components/SequencePlayer';
import { recordPlay } from '../utils/playStats';
import { populateMissingDurations } from '../utils/audioUtils';

export function SoundboardsView({ volume = 100, audioControlRef, playMode, onProgressChange }: { volume?: number; audioControlRef?: React.MutableRefObject<{ stop: () => void } | null>; playMode: 'instant' | 'sequence'; onProgressChange?: (progress: number, duration: number) => void }) {
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
  const [fullscreenMode, setFullscreenMode] = useState(false);

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
      .then((samplesWithDuration) => setSamples(samplesWithDuration))
      .finally(() => setLoadingSamples(false));
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
  };

  const handlePlay = (sample: Sample) => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    const newAudio = new Audio(`/api/samples/${sample.id}/audio`);
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

  return (
    <Stack direction="row" spacing={3} sx={{ height: '100%' }}>
      {!fullscreenMode && (
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

      <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {!selectedGroupId ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Typography color="text.secondary">
              Select a soundboard from the left or create a new one.
            </Typography>
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
            <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="Search sounds by name or tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ flex: 1, maxWidth: 400 }}
              />
              <Button
                size="small"
                variant={fullscreenMode ? 'contained' : 'outlined'}
                onClick={() => setFullscreenMode(!fullscreenMode)}
              >
                {fullscreenMode ? 'Fullscreen: On' : 'Fullscreen'}
              </Button>
            </Stack>
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              <SampleGrid
                samples={filteredSamples}
                currentlyPlayingId={currentlyPlayingId}
                onPlay={playMode === 'sequence' ? handleAddToSequence : handlePlay}
                playingPositionSeconds={positionSeconds}
                playingDurationSeconds={durationSeconds}
                scaleMode={fullscreenMode}
                sequenceMode={playMode === 'sequence'}
              />
            </Box>
          </>
        )}
      </Box>

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
    </Stack>
  );
}

