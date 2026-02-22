import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Stack
} from '@mui/material';
import { api } from '../api/client';
import type { SequenceClip } from './SequencePlayer';
import type { SavedSequenceItem } from '../api/types';

interface SaveSequenceDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  sequenceClips: SequenceClip[];
  soundboardId: string;
  loadedSequenceId?: string | null;
  loadedSequenceName?: string;
}

export function SaveSequenceDialog({
  open,
  onClose,
  onSave,
  sequenceClips,
  soundboardId,
  loadedSequenceId = null,
  loadedSequenceName = ''
}: SaveSequenceDialogProps) {
  const [sequenceName, setSequenceName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMode, setSaveMode] = useState<'save' | 'saveAsNew'>('saveAsNew');

  // Initialize name when dialog opens
  useEffect(() => {
    if (open) {
      if (loadedSequenceId && loadedSequenceName) {
        setSequenceName(loadedSequenceName);
        setSaveMode('save');
      } else {
        setSequenceName('');
        setSaveMode('saveAsNew');
      }
      setError(null);
    }
  }, [open, loadedSequenceId, loadedSequenceName]);

  const handleSave = async () => {
    if (!sequenceName.trim()) {
      setError('Sequence name is required');
      return;
    }

    if (sequenceClips.length === 0) {
      setError('Sequence must contain at least one sound');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Convert SequenceClip to SavedSequenceItem format
      const sequenceData: SavedSequenceItem[] = sequenceClips.map(clip => ({
        sampleId: clip.sample.id
      }));

      if (saveMode === 'save' && loadedSequenceId) {
        // Update existing sequence
        await api.put(
          `/api/sample-groups/${soundboardId}/sequences/${loadedSequenceId}`,
          {
            name: sequenceName.trim(),
            sequenceData
          }
        );
      } else {
        // Create new sequence
        await api.post(`/api/sample-groups/${soundboardId}/sequences`, {
          name: sequenceName.trim(),
          sequenceData
        });
      }

      setSequenceName('');
      onSave();
      onClose();
    } catch (err) {
      console.error('Failed to save sequence:', err);
      setError('Failed to save sequence. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSequenceName('');
      setError(null);
      onClose();
    }
  };

  const showBothOptions = loadedSequenceId && loadedSequenceName;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {showBothOptions ? 'Save Sequence Changes' : 'Save Sequence'}
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        {showBothOptions && (
          <Stack spacing={2} sx={{ mb: 2 }}>
            <Button
              variant={saveMode === 'save' ? 'contained' : 'outlined'}
              onClick={() => setSaveMode('save')}
              disabled={loading}
            >
              💾 Save (Update "{loadedSequenceName}")
            </Button>
            <Button
              variant={saveMode === 'saveAsNew' ? 'contained' : 'outlined'}
              onClick={() => setSaveMode('saveAsNew')}
              disabled={loading}
            >
              ➕ Save as New
            </Button>
          </Stack>
        )}

        <TextField
          autoFocus
          label="Sequence name"
          fullWidth
          value={sequenceName}
          onChange={(e) => setSequenceName(e.target.value)}
          placeholder="e.g., Intro Loop"
          disabled={loading}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !loading) {
              handleSave();
            }
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading || !sequenceName.trim()}
          startIcon={loading ? <CircularProgress size={20} /> : undefined}
        >
          {loading 
            ? 'Saving...' 
            : saveMode === 'save' 
              ? 'Update' 
              : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
