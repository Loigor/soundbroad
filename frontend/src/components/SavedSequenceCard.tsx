import { Box, Button, Card, CardContent, Stack, Typography, IconButton } from '@mui/material';
import type { Sequence, Sample } from '../api/types';

interface SavedSequenceCardProps {
  sequence: Sequence;
  onLoad: () => void;
  onPlay: () => void;
  onDelete: () => void;
  samples: Map<string, Sample>;
}

export function SavedSequenceCard({
  sequence,
  onLoad,
  onPlay,
  onDelete,
  samples
}: SavedSequenceCardProps) {
  // Get the names of samples in this sequence for preview
  const sampleNames = sequence.sequence_data
    .slice(0, 3)
    .map(clip => samples.get(clip.sampleId)?.name)
    .filter(Boolean);

  const remainingCount = sequence.sequence_data.length - 3;

  return (
    <Card
      onClick={onLoad}
      sx={{
        background: 'linear-gradient(135deg, rgba(100, 200, 255, 0.15) 0%, rgba(150, 100, 255, 0.15) 100%)',
        border: '2px solid rgba(100, 200, 255, 0.4)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          background: 'linear-gradient(135deg, rgba(100, 200, 255, 0.25) 0%, rgba(150, 100, 255, 0.25) 100%)',
          borderColor: 'rgba(100, 200, 255, 0.6)',
          boxShadow: '0 0 20px rgba(100, 200, 255, 0.3)'
        },
        height: '100%'
      }}
    >
      <CardContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '100%',
          p: 2
        }}
      >
        <Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: 'rgba(100, 200, 255, 1)',
              mb: 1,
              wordBreak: 'break-word',
              fontSize: { xs: '0.9rem', sm: '1rem' }
            }}
          >
            ⏱️ {sequence.name}
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: { xs: '0.75rem', sm: '0.8rem' }
            }}
          >
            {sequence.sequence_data.length} sound{sequence.sequence_data.length !== 1 ? 's' : ''}
          </Typography>

          {sampleNames.length > 0 && (
            <Typography
              variant="caption"
              sx={{
                color: 'rgba(200, 200, 255, 0.8)',
                fontSize: { xs: '0.65rem', sm: '0.7rem' },
                display: 'block',
                mt: 0.5,
                opacity: 0.8
              }}
            >
              {sampleNames.join(', ')}
              {remainingCount > 0 && ` +${remainingCount}`}
            </Typography>
          )}
        </Box>

        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Button
            variant="contained"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
            fullWidth
            sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' }, py: { xs: 0.5, sm: 1 } }}
          >
            ▶ Play
          </Button>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            sx={{
              color: 'rgba(255, 100, 100, 0.7)',
              '&:hover': {
                color: 'rgba(255, 100, 100, 1)',
                backgroundColor: 'rgba(255, 100, 100, 0.1)'
              }
            }}
          >
            ✕
          </IconButton>
        </Stack>
      </CardContent>
    </Card>
  );
}
