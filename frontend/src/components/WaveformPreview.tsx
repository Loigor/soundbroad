import { useEffect, useRef, useState } from 'react';
import { Box, keyframes } from '@mui/material';
import WaveSurfer from 'wavesurfer.js';

// Blinking animation for end warning
const blinkAnimation = keyframes`
  0%, 49% {
    opacity: 1;
  }
  50%, 100% {
    opacity: 0.3;
  }
`;

export interface WaveformPreviewProps {
  audioUrl: string;
  isPlaying?: boolean;
  currentTime?: number | null;
  duration?: number | null;
  progressColor?: string;
}

export function WaveformPreview({ 
  audioUrl, 
  isPlaying = false, 
  currentTime = null,
  duration = null,
  progressColor = 'rgba(33, 150, 243, 0.8)'
}: WaveformPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      height: 56,
      waveColor: 'rgba(255,255,255,0.35)',
      progressColor: 'rgba(255,255,255,0)',
      cursorWidth: 0,
      barWidth: 2,
      barGap: 1,
      interact: false,
      normalize: true,
      hideScrollbar: true
    });

    wavesurfer.load(audioUrl);
    wavesurferRef.current = wavesurfer;

    // Get container width for progress calculation
    const width = containerRef.current.offsetWidth;
    setContainerWidth(width);

    return () => {
      wavesurfer.destroy();
    };
  }, [audioUrl]);

  // Calculate progress position without moving waveform
  const progressPercent = currentTime !== null && duration !== null && duration > 0 
    ? (currentTime / duration) * 100 
    : 0;

  // Check if near the end (within 3 seconds)
  const isNearEnd = duration !== null && currentTime !== null && (duration - currentTime) < 3;

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      
      {/* Main progress indicator line */}
      {isPlaying && duration !== null && duration > 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: `${progressPercent}%`,
            height: '100%',
            width: '3px',
            backgroundColor: progressColor,
            pointerEvents: 'none',
            boxShadow: `0 0 12px ${progressColor.replace('0.8', '0.8').replace('0.7', '0.7').replace('0.9', '0.8')}`,
            animation: isNearEnd ? `${blinkAnimation} 0.6s infinite` : 'none',
            borderLeft: isNearEnd ? '1px solid rgba(255, 100, 100, 0.8)' : 'none',
            borderRight: isNearEnd ? '1px solid rgba(255, 100, 100, 0.8)' : 'none'
          }}
        />
      )}
    </Box>
  );
}

