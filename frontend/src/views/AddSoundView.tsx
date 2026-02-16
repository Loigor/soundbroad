import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import { api } from '../api/client';
import type { Sample, SampleGroup } from '../api/types';

export function AddSoundView() {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [tagInput, setTagInput] = useState<string[]>([]);
  const [tagText, setTagText] = useState('');
  const [allSamples, setAllSamples] = useState<Sample[]>([]);
  const [groups, setGroups] = useState<SampleGroup[]>([]);
  const [groupId, setGroupId] = useState<string | 'none'>('none');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [color, setColor] = useState<string>('#424242');

  useEffect(() => {
    api
      .get<Sample[]>('/api/samples')
      .then((res) => setAllSamples(res.data))
      .catch(() => {
        // ignore for now
      });
    api
      .get<SampleGroup[]>('/api/sample-groups')
      .then((res) => setGroups(res.data))
      .catch(() => {
        // ignore for now
      });
  }, []);

  const tagSuggestions = useMemo(() => {
    const set = new Set<string>();
    allSamples.forEach((s) => s.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allSamples]);

  const handleFileChange = (f: File | null) => {
    setFile(f);
    if (f && !name.trim()) {
      const base = f.name.replace(/\.[^.]+$/, '');
      setName(base);
    }
    if (f) {
      const url = URL.createObjectURL(f);
      const audio = new Audio(url);
      audio.onloadedmetadata = () => {
        setDurationSeconds(audio.duration || null);
        URL.revokeObjectURL(url);
      };
    } else {
      setDurationSeconds(null);
    }
  };

  const handleSubmit = async () => {
    if (!file || !name.trim()) {
      setErrorMessage('File and name are required.');
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('name', name.trim());
      if (tagInput.length) {
        form.append('tags', tagInput.join(','));
      }
      if (durationSeconds != null) {
        form.append('durationSeconds', String(durationSeconds));
      }
      if (color) {
        form.append('color', color);
      }
      if (groupId !== 'none') {
        form.append('groupIds', groupId);
      }
      await api.post('/api/samples', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccessMessage('Sample uploaded.');
      setFile(null);
      setName('');
      setTagInput([]);
      setTagText('');
      setGroupId('none');
      setDurationSeconds(null);
      setColor('#424242');
    } catch (e) {
      console.error(e);
      setErrorMessage('Failed to upload sample.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    api
      .post<SampleGroup>('/api/sample-groups', { name: newGroupName.trim() })
      .then((res) => {
        setGroups((prev) => [res.data, ...prev]);
        setGroupId(res.data.id);
        setNewGroupName('');
        setCreatingGroup(false);
      })
      .catch(() => {
        // could show error
      });
  };

  return (
    <Box sx={{ maxWidth: 600 }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Add sound
      </Typography>

      <Stack spacing={2}>
        <Button variant="outlined" component="label">
          {file ? `File: ${file.name}` : 'Choose audio file'}
          <input
            type="file"
            accept="audio/*"
            hidden
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          />
        </Button>

        <TextField
          label="Name"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          helperText="Defaults to file name, but you can edit."
        />

        <Autocomplete
          multiple
          freeSolo
          options={tagSuggestions}
          value={tagInput}
          inputValue={tagText}
          onInputChange={(_e, value) => setTagText(value)}
          onChange={(_e, value) => setTagInput(value)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Tags"
              placeholder="Type tag and press Space"
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  const trimmed = tagText.trim();
                  if (trimmed && !tagInput.includes(trimmed)) {
                    setTagInput([...tagInput, trimmed]);
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

        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl fullWidth>
            <InputLabel id="group-select-label">Soundboard</InputLabel>
            <Select
              labelId="group-select-label"
              label="Soundboard"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value as string | 'none')}
            >
              <MenuItem value="none">None</MenuItem>
              {groups.map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={() => setCreatingGroup(true)}>
            New
          </Button>
        </Stack>

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Color
          </Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={color}
            onChange={(_e, value) => {
              if (value) setColor(value);
            }}
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
          </ToggleButtonGroup>
        </Box>

        {successMessage && (
          <Alert severity="success" onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}
        {errorMessage && (
          <Alert severity="error" onClose={() => setErrorMessage(null)}>
            {errorMessage}
          </Alert>
        )}

        <Box>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting || !file || !name.trim()}
          >
            {submitting ? 'Uploading…' : 'Add sound'}
          </Button>
        </Box>
      </Stack>

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
    </Box>
  );
}

