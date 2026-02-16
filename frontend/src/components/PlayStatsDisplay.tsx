import { Tooltip, Box, Typography } from '@mui/material';
import { getPlayStats, getLastPlayedTime, formatTimeAgo } from '../utils/playStats';

export interface PlayStatsDisplayProps {
  sampleId: string;
}

export function PlayStatsDisplay({ sampleId }: PlayStatsDisplayProps) {
  const stats = getPlayStats(sampleId);
  const lastPlayedTime = getLastPlayedTime(sampleId);

  if (stats.count === 0) {
    return null;
  }

  const tooltipTitle = lastPlayedTime 
    ? `Last played ${formatTimeAgo(lastPlayedTime)}`
    : 'Never played';

  return (
    <Tooltip title={tooltipTitle} arrow>
      <Box
        sx={{
          display: 'inline-block',
          px: 0.75,
          py: 0.25,
          backgroundColor: 'rgba(33, 150, 243, 0.15)',
          borderRadius: '12px',
          cursor: 'help',
          transition: 'background-color 0.2s',
          '&:hover': {
            backgroundColor: 'rgba(33, 150, 243, 0.25)'
          }
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.65rem',
            fontWeight: 600,
            color: 'rgba(33, 150, 243, 0.9)',
            whiteSpace: 'nowrap'
          }}
        >
          Played {stats.count}x
        </Typography>
      </Box>
    </Tooltip>
  );
}
