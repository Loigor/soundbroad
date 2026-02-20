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
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { api } from '../api/client';
import type { Sample, SampleGroup } from '../api/types';

interface UploadedFile {
  id: string;
  file: File;
  name: string;
  durationSeconds: number | null;
}

export function AddSoundView() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
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

  const handleFileChange = (files: FileList | null) => {
    if (!files) return;
    
    const newFiles: UploadedFile[] = [];
    let filesProcessed = 0;

    Array.from(files).forEach((file) => {
      const id = `${Date.now()}-${Math.random()}`;
      const base = file.name.replace(/\.[^.]+$/, '');
      
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      
      audio.onloadedmetadata = () => {
        newFiles.push({
          id,
          file,
          name: base,
          durationSeconds: audio.duration || null
        });
        URL.revokeObjectURL(url);
        filesProcessed++;
        
        // Add all files once they're all processed
        if (filesProcessed === Array.from(files).length) {
          setUploadedFiles((prev) => [...prev, ...newFiles]);
        }
      };
      
      // Fallback in case metadata loading fails
      audio.onerror = () => {
        newFiles.push({
          id,
          file,
          name: base,
          durationSeconds: null
        });
        URL.revokeObjectURL(url);
        filesProcessed++;
        
        if (filesProcessed === Array.from(files).length) {
          setUploadedFiles((prev) => [...prev, ...newFiles]);
        }
      };
    });
  };

  const handleRemoveFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUpdateFileName = (id: string, newName: string) => {
    setUploadedFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name: newName } : f))
    );
  };

  const handleSubmit = async () => {
    if (uploadedFiles.length === 0) {
      setErrorMessage('Please add at least one sound.');
      return;
    }
    
    // Check all files have names
    if (uploadedFiles.some((f) => !f.name.trim())) {
      setErrorMessage('All sounds must have names.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    
    try {
      let successCount = 0;
      let failureCount = 0;

      // Upload all files
      for (const uploadedFile of uploadedFiles) {
        try {
          const form = new FormData();
          form.append('file', uploadedFile.file);
          form.append('name', uploadedFile.name.trim());
          
          if (tagInput.length) {
            form.append('tags', tagInput.join(','));
          }
          if (uploadedFile.durationSeconds != null) {
            form.append('durationSeconds', String(uploadedFile.durationSeconds));
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
          
          successCount++;
        } catch (e) {
          console.error('Failed to upload:', uploadedFile.name, e);
          failureCount++;
        }
      }

      // Show results
      if (failureCount === 0) {
        setSuccessMessage(`Successfully uploaded ${successCount} sound${successCount !== 1 ? 's' : ''}.`);
      } else {
        setSuccessMessage(
          `Uploaded ${successCount} sound${successCount !== 1 ? 's' : ''}, failed: ${failureCount}.`
        );
      }

      // Reset form
      setUploadedFiles([]);
      setTagInput([]);
      setTagText('');
      setGroupId('none');
      setColor('#424242');
    } catch (e) {
      console.error(e);
      setErrorMessage('Failed to upload sounds.');
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
    <Box sx={{ maxWidth: 900 }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Add sounds
      </Typography>

      <Stack spacing={2}>
        {/* File upload button */}
        <Button variant="outlined" component="label">
          Add audio files
          <input
            type="file"
            accept="audio/*"
            multiple
            hidden
            onChange={(e) => handleFileChange(e.target.files)}
          />
        </Button>

        {/* Uploaded files table */}
        {uploadedFiles.length > 0 && (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 600 }}>File</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Duration</TableCell>
                  <TableCell sx={{ width: 50 }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {uploadedFiles.map((uploadedFile) => (
                  <TableRow key={uploadedFile.id}>
                    <TableCell sx={{ fontSize: '0.875rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {uploadedFile.file.name}
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        value={uploadedFile.name}
                        onChange={(e) => handleUpdateFileName(uploadedFile.id, e.target.value)}
                        fullWidth
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.875rem' }}>
                      {uploadedFile.durationSeconds != null
                        ? `${Math.round(uploadedFile.durationSeconds)}s`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveFile(uploadedFile.id)}
                        sx={{ color: 'error.main' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Shared controls for all uploads */}
        <Typography variant="subtitle2" sx={{ mt: uploadedFiles.length > 0 ? 1 : 0, fontWeight: 600 }}>
          {uploadedFiles.length > 0 ? 'Apply to all sounds:' : 'Configure for sounds:'}
        </Typography>

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
            disabled={submitting || uploadedFiles.length === 0}
          >
            {submitting ? 'Uploading…' : `Upload ${uploadedFiles.length} sound${uploadedFiles.length !== 1 ? 's' : ''}`}
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

