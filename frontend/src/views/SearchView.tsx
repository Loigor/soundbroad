import { useEffect, useMemo, useState, useRef } from 'react';
import { Box, CircularProgress, TextField } from '@mui/material';
import { api } from '../api/client';
import type { Sample, SampleGroup } from '../api/types';
import { SampleGrid } from '../components/SampleGrid';
import { SequencePlayer, type SequenceClip, type SequencePlayerHandle } from '../components/SequencePlayer';
import { recordPlay } from '../utils/playStats';
import { populateMissingDurations } from '../utils/audioUtils';

export function SearchView({ volume = 100, audioControlRef, playMode, onProgressChange }: { volume?: number; audioControlRef?: React.MutableRefObject<{ stop: () => void } | null>; playMode: 'instant' | 'sequence'; onProgressChange?: (progress: number, duration: number) => void }) {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [groups, setGroups] = useState<SampleGroup[]>([]);
  const [sequenceClips, setSequenceClips] = useState<SequenceClip[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [positionSeconds, setPositionSeconds] = useState<number | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<Sample[]>('/api/samples')
      .then((res) => {
        if (!cancelled) {
          console.debug('[SearchView] Samples from API:', res.data.map(s => ({ id: s.id, name: s.name, duration: s.duration_seconds, type: typeof s.duration_seconds })));
          // Populate missing durations for samples that don't have them
          return populateMissingDurations(res.data, (id) => `/api/samples/${id}/audio`);
        }
      })
      .then((samplesWithDuration) => {
        if (!cancelled && samplesWithDuration) {
          console.debug('[SearchView] After populateMissingDurations:', samplesWithDuration.map(s => ({ id: s.id, name: s.name, duration: s.duration_seconds, type: typeof s.duration_seconds })));
          setSamples(samplesWithDuration);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingGroups(true);
    api
      .get<SampleGroup[]>('/api/sample-groups')
      .then((res) => {
        if (!cancelled) {
          setGroups(res.data);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingGroups(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return samples;
    return samples.filter((s) => {
      const inName = s.name.toLowerCase().includes(term);
      const inTags = s.tags.some((t) => t.toLowerCase().includes(term));
      return inName || inTags;
    });
  }, [samples, searchTerm]);

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

  const handleAddToGroup = async (sampleId: string, groupId: string) => {
    try {
      await api.post(`/api/sample-groups/${groupId}/samples`, { sampleId });
    } catch (error) {
      console.error('Failed to add sample to group:', error);
    }
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

  // Update volume for currently playing audio
  useEffect(() => {
    if (audio && currentlyPlayingId) {
      audio.volume = volume / 100;
    }
  }, [volume, audio, currentlyPlayingId]);

  const sequencePlayerRef = useRef<React.ComponentRef<typeof SequencePlayer>>(null);

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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
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
      <TextField
        label="Search by name or tag"
        variant="outlined"
        size="small"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress size={32} />
        </Box>
      ) : (
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <SampleGrid
            samples={filtered}
            currentlyPlayingId={currentlyPlayingId}
            onPlay={playMode === 'sequence' ? handleAddToSequence : handlePlay}
            playingPositionSeconds={positionSeconds}
            playingDurationSeconds={durationSeconds}
            groups={groups}
            onAddToGroup={handleAddToGroup}
            onDelete={handleDeleteSample}
            sequenceMode={playMode === 'sequence'}
          />
        </Box>
      )}
    </Box>
  );
}

