import { useRef, useState, useCallback } from 'react';
import {
  AppBar,
  Box,
  Container,
  LinearProgress,
  Menu,
  MenuItem,
  Slider,
  Stack,
  Tab,
  Tabs,
  Toolbar,
  Typography,
  Button,
  keyframes
} from '@mui/material';
// Icons are causing module resolution issues, will use text labels instead

// Blinking animation for end warning
const blinkAnimation = keyframes`
  0%, 49% {
    opacity: 1;
  }
  50%, 100% {
    opacity: 0.3;
  }
`;
import { SearchView } from './views/SearchView';
import { SoundboardsView } from './views/SoundboardsView';
import { AddSoundView } from './views/AddSoundView';
import { clearAllPlayStats } from './utils/playStats';

type MainTab = 'search' | 'soundboards' | 'add';
type PlayMode = 'instant' | 'sequence';

function App() {
  const [tab, setTab] = useState<MainTab>('search');
  const [playMode, setPlayMode] = useState<PlayMode>('instant');
  const [volume, setVolume] = useState(100);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const audioControlRef = useRef<{ stop: () => void } | null>(null);
  const [settingsAnchor, setSettingsAnchor] = useState<null | HTMLElement>(null);

  const handleStop = () => {
    audioControlRef.current?.stop();
  };

  const handleSettingsOpen = (event: React.MouseEvent<HTMLElement>) => {
    setSettingsAnchor(event.currentTarget);
  };

  const handleSettingsClose = () => {
    setSettingsAnchor(null);
  };

  const handleResetPlayStats = () => {
    clearAllPlayStats();
    handleSettingsClose();
    window.location.reload();
  };

  // Check if near the end (within 3 seconds)
  const isNearEnd = totalDuration > 0 && (totalDuration - playbackProgress) < 3;
  const progressPercent = totalDuration > 0 ? (playbackProgress / totalDuration) * 100 : 0;

  // Memoize progress callback
  const handleProgressChange = useCallback((progress: number, duration: number) => {
    setPlaybackProgress(progress);
    setTotalDuration(duration);
  }, []);

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <img 
              src="/logo-favicon.svg" 
              alt="Soundbroad logo" 
              style={{ height: 36, width: 36 }}
            />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Soundbroad
            </Typography>
            <Tabs
              value={tab}
              onChange={(_e, value) => setTab(value)}
              textColor="inherit"
              indicatorColor="primary"
            >
              <Tab value="search" label="Search" />
              <Tab value="soundboards" label="Soundboards" />
              <Tab value="add" label="Add sound" />
            </Tabs>
          </Box>
          
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 550 }}>
            <Typography sx={{ fontSize: 14 }}>🔊</Typography>
            <Slider
              value={volume}
              onChange={(_e, newValue) => setVolume(newValue as number)}
              min={0}
              max={100}
              sx={{ 
                flex: 1, 
                minWidth: 120,
                '& .MuiSlider-thumb': {
                  width: 16,
                  height: 16,
                  backgroundColor: '#fff',
                  '&:hover': {
                    boxShadow: '0 0 0 8px rgba(255, 255, 255, 0.16)',
                  }
                },
                '& .MuiSlider-track': {
                  height: 4,
                  backgroundColor: 'rgba(33, 150, 243, 0.7)',
                }
              }}
            />
            <Typography sx={{ fontSize: 14 }}>🔔</Typography>
            <Button
              size="small"
              variant={playMode === 'instant' ? 'contained' : 'outlined'}
              onClick={() => setPlayMode('instant')}
              sx={{ width: 100 }}
            >
              Instant
            </Button>
            <Button
              size="small"
              variant={playMode === 'sequence' ? 'contained' : 'outlined'}
              onClick={() => setPlayMode('sequence')}
              sx={{ width: 100 }}
            >
              Sequence
            </Button>
            <Button
              size="small"
              onClick={handleStop}
              title="Stop playback"
            >
              ⏹ Stop
            </Button>
            <Button
              size="small"
              onClick={handleSettingsOpen}
              title="Settings"
            >
              ⚙️
            </Button>
          </Stack>
          
          <Menu
            anchorEl={settingsAnchor}
            open={Boolean(settingsAnchor)}
            onClose={handleSettingsClose}
          >
            <MenuItem onClick={handleResetPlayStats}>
              Reset play statistics
            </MenuItem>
          </Menu>
        </Toolbar>
        
        {/* Playback progress indicator - shows for both instant and sequence modes */}
        {totalDuration > 0 && (
          <Box sx={{ px: 2, pb: 1 }}>
            <LinearProgress 
              variant="determinate" 
              value={progressPercent}
              sx={{ 
                height: 6, 
                borderRadius: 1,
                backgroundColor: isNearEnd ? 'rgba(255, 100, 100, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: isNearEnd ? 'rgba(255, 100, 100, 0.9)' : 'rgba(33, 150, 243, 0.8)',
                  animation: isNearEnd ? `${blinkAnimation} 0.6s infinite` : 'none'
                }
              }}
            />
          </Box>
        )}
      </AppBar>

      <Box
        component="main"
        sx={{
          flex: 1,
          overflow: 'hidden',
          py: 2
        }}
      >
        <Container maxWidth="lg" sx={{ height: '100%' }}>
          {tab === 'search' && <SearchView volume={volume} audioControlRef={audioControlRef} playMode={playMode} onProgressChange={handleProgressChange} />}
          {tab === 'soundboards' && <SoundboardsView volume={volume} audioControlRef={audioControlRef} playMode={playMode} onProgressChange={handleProgressChange} />}
          {tab === 'add' && <AddSoundView />}
        </Container>
      </Box>
    </Box>
  );
}

export default App;

