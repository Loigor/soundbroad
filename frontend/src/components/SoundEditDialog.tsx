import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Autocomplete
} from '@mui/material';
import type { Sample } from '../api/types';
import { api } from '../api/client';

interface SoundEditDialogProps {
  open: boolean;
  sound: Sample | null;
  onClose: () => void;
  onSave: (updatedSound: Sample) => void;
  onDelete: (soundId: string) => void;
}

export function SoundEditDialog({
  open,
  sound,
  onClose,
  onSave,
  onDelete
}: SoundEditDialogProps) {
  const [name, setName] = useState(sound?.name ?? '');
  const [color, setColor] = useState(sound?.color ?? '#424242');
  const [customColor, setCustomColor] = useState(sound?.color ?? '#424242');
  const [useCustomColor, setUseCustomColor] = useState(false);
  const [tags, setTags] = useState<string[]>(sound?.tags ?? []);
  const [tagText, setTagText] = useState('');
  const [allSamples, setAllSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const tagSuggestions = useMemo(() => {
    const set = new Set<string>();
    allSamples.forEach((s) => s.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allSamples]);

  // Fetch all samples for tag suggestions
  useEffect(() => {
    api
      .get<Sample[]>('/api/samples')
      .then((res) => setAllSamples(res.data))
      .catch(() => {
        // ignore for now
      });
  }, []);

  // Update local state when sound prop changes
  useEffect(() => {
    if (sound) {
      setName(sound.name);
      const soundColor = sound.color ?? '#424242';
      setColor(soundColor);
      setCustomColor(soundColor);
      setTags(sound.tags ?? []);
      setTagText('');
      setError('');
      // Check if color is a custom color (not in preset list)
      const presetColors = ['#424242', '#1e88e5', '#43a047', '#fbc02d', '#e53935', '#8e24aa'];
      setUseCustomColor(!presetColors.includes(soundColor));
    }
  }, [sound, open]);

  const handleSave = async () => {
    if (!sound || !name.trim()) {
      setError('Name is required');
      return;
    }

    const finalColor = useCustomColor ? customColor : color;
    setLoading(true);
    try {
      await api.put(`/api/samples/${sound.id}`, {
        name: name.trim(),
        color: finalColor,
        tags: tags
      });

      onSave({
        ...sound,
        name: name.trim(),
        color: finalColor,
        tags: tags
      });

      onClose();
    } catch (err) {
      setError('Failed to update sound');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!sound) return;

    if (!window.confirm(`Are you sure you want to permanently delete "${sound.name}"? This cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      await api.delete(`/api/samples/${sound.id}`);
      onDelete(sound.id);
      onClose();
    } catch (err) {
      setError('Failed to delete sound');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit Sound</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <TextField
          autoFocus
          fullWidth
          label="Sound Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          margin="dense"
          variant="outlined"
          disabled={loading}
        />

        <Autocomplete
          multiple
          freeSolo
          options={tagSuggestions}
          value={tags}
          inputValue={tagText}
          onInputChange={(_e, value) => setTagText(value)}
          onChange={(_e, value) => setTags(value)}
          disabled={loading}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Tags"
              placeholder="Type tag and press Space"
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  const trimmed = tagText.trim();
                  if (trimmed && !tags.includes(trimmed)) {
                    setTags([...tags, trimmed]);
                  }
                  setTagText('');
                  if (e.key === ' ') {
                    e.preventDefault();
                  }
                }
              }}
            />
          )}
        />

        <Box sx={{ mt: 3, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Color
          </Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={useCustomColor ? 'custom' : color}
            onChange={(_e, value) => {
              if (value === 'custom') {
                setUseCustomColor(true);
              } else if (value) {
                setColor(value as string);
                setUseCustomColor(false);
              }
            }}
            disabled={loading}
          >
            {['#424242', '#1e88e5', '#43a047', '#fbc02d', '#e53935', '#8e24aa'].map((c) => (
              <ToggleButton key={c} value={c}>
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    bgcolor: c,
                    border: '1px solid rgba(255,255,255,0.4)'
                  }}
                />
              </ToggleButton>
            ))}
            <ToggleButton value="custom">
              <Typography variant="caption">Custom</Typography>
            </ToggleButton>
          </ToggleButtonGroup>

          {useCustomColor && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 2 }}>
              <input
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                disabled={loading}
                style={{
                  width: 60,
                  height: 40,
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 4,
                  cursor: loading ? 'default' : 'pointer'
                }}
              />
              <TextField
                size="small"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                placeholder="#424242"
                sx={{ flex: 1, maxWidth: 120 }}
                disabled={loading}
              />
            </Box>
          )}
        </Box>

        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDelete} color="error" disabled={loading} sx={{ mr: 'auto' }}>
          Delete File
        </Button>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading || !name.trim()}
          sx={{ minWidth: 80 }}
        >
          {loading ? <CircularProgress size={20} /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
