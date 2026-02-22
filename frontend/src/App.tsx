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
  ToggleButton,
  ToggleButtonGroup,
  keyframes,
  useMediaQuery,
  useTheme
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
import { audioPreloader } from './utils/audioPreloader';

type MainTab = 'search' | 'soundboards' | 'add';
type PlayMode = 'instant' | 'sequence';

function App() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [tab, setTab] = useState<MainTab>('search');
  const [playMode, setPlayMode] = useState<PlayMode>('instant');
  const [volume, setVolume] = useState(100);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [enablePreload, setEnablePreload] = useState(true);
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

  const handleTogglePreload = () => {
    const newValue = !enablePreload;
    setEnablePreload(newValue);
    audioPreloader.setEnabled(newValue);
    handleSettingsClose();
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
      {/* Top AppBar with tabs only */}
      <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
            <img 
              src="/logo-favicon.svg" 
              alt="Soundbroad logo" 
              style={{ height: 36, width: 36 }}
            />
            <Typography variant="h6" sx={{ fontWeight: 600, display: { xs: 'none', sm: 'inline' } }}>
              Soundbroad
            </Typography>
          </Box>
          
          <Tabs
            value={tab}
            onChange={(_e, value) => setTab(value)}
            textColor="inherit"
            indicatorColor="primary"
            sx={{ flex: 1, justifyContent: 'center' }}
          >
            <Tab value="search" label={isMobile ? "Search" : "Search"} />
            <Tab value="soundboards" label={isMobile ? "Boards" : "Soundboards"} />
            <Tab value="add" label="Add" />
          </Tabs>

          <Box sx={{ width: 36 }} />
        </Toolbar>
        
        {/* Playback progress indicator */}
        {totalDuration > 0 && (
          <Box sx={{ px: 2, pb: 1 }}>
            <LinearProgress 
              variant="determinate" 
              value={progressPercent}
              sx={{ 
                height: 8, 
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

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          overflow: 'hidden',
          pt: 2,
          pb: isMobile ? 9 : 8
        }}
      >
        <Container maxWidth="lg" sx={{ height: '100%', px: isMobile ? 1 : undefined }}>
          {tab === 'search' && <SearchView volume={volume} audioControlRef={audioControlRef} playMode={playMode} onProgressChange={handleProgressChange} enablePreload={enablePreload} />}
          {tab === 'soundboards' && <SoundboardsView volume={volume} audioControlRef={audioControlRef} playMode={playMode} onProgressChange={handleProgressChange} enablePreload={enablePreload} onPlayModeChange={setPlayMode} />}
          {tab === 'add' && <AddSoundView />}
        </Container>
      </Box>

      {/* Bottom overlay menu */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          zIndex: 1000,
          p: isMobile ? 0.75 : 1,
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          justifyContent: 'center'
        }}
      >
        <Stack
          spacing={isMobile ? 0.75 : 1}
          sx={{
            flexWrap: isMobile ? 'wrap' : 'nowrap',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: isMobile ? 'center' : 'space-between',
            width: '100%',
            maxWidth: isMobile ? 900 : 'none'
          }}
        >
          {/* Volume control */}
          <Stack
            direction="row"
            spacing={0.75}
            sx={{
              alignItems: 'center',
              flex: isMobile ? '0 1 100%' : '0 1 auto',
              maxWidth: 200,
              minWidth: isMobile ? 'auto' : 160,
              mx: isMobile ? 0 : 1,
              order: isMobile ? 1 : 0
            }}
          >
            <Button
                size="small"
                onClick={handleStop}
                title="Stop playback"
                variant="outlined"
                sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem', py: isMobile ? 0.3 : 0.4, px: isMobile ? 0.75 : 1 }}
              >
                ⏹ Stop
              </Button>
            <Typography sx={{ fontSize: { xs: 11, sm: 12 }, flexShrink: 0 }}>🔊</Typography>
            <Slider
              value={volume}
              onChange={(_e, newValue) => setVolume(newValue as number)}
              min={0}
              max={100}
              sx={{ 
                flex: 1,
                minWidth: 60,
                '& .MuiSlider-thumb': {
                  width: 12,
                  height: 12,
                  backgroundColor: '#fff',
                  '&:hover': {
                    boxShadow: '0 0 0 6px rgba(255, 255, 255, 0.16)',
                  }
                },
                '& .MuiSlider-track': {
                  height: 2,
                  backgroundColor: 'rgba(33, 150, 243, 0.7)',
                }
              }}
            />
            <Typography sx={{ fontSize: { xs: 11, sm: 12 }, minWidth: 24, textAlign: 'right' }}>
              {volume}%
            </Typography>
          </Stack>

          {/* Control buttons */}
          <Stack
            direction={isMobile ? 'column' : 'row'}
            spacing={isMobile ? 0.5 : 0.75}
            sx={{
              flex: isMobile ? '0 1 100%' : '0 1 auto',
              justifyContent: 'center',
              alignItems: 'center',
              mx: isMobile ? 0 : 1,
              order: isMobile ? 0 : 1
            }}
          >
            <Stack direction="row" spacing={isMobile ? 0.3 : 0.5} sx={{ alignItems: 'center' }}>
              <ToggleButtonGroup
                value={playMode}
                exclusive
                onChange={(_e, newMode) => {
                  if (newMode !== null) {
                    setPlayMode(newMode);
                  }
                }}
                size="small"
                sx={{
                  '& .MuiToggleButton-root': {
                    fontSize: isMobile ? '0.65rem' : '0.75rem',
                    py: isMobile ? 0.3 : 0.4,
                    px: isMobile ? 0.75 : 1,
                    textTransform: 'none',
                    borderColor: 'rgba(255, 255, 255, 0.23)',
                    color: 'inherit',
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: '#fff',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      }
                    }
                  }
                }}
              >
                <ToggleButton value="instant">
                  Instant
                </ToggleButton>
                <ToggleButton value="sequence">
                  Sequence
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>

            <Stack direction="row" spacing={isMobile ? 0.3 : 0.5} sx={{ alignItems: 'center' }}>
              <Button
                size="small"
                onClick={handleSettingsOpen}
                title="Settings"
                variant="outlined"
                sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem', py: isMobile ? 0.3 : 0.4, px: isMobile ? 0.75 : 1 }}
              >
                ⚙️ {!isMobile && 'Settings'}
              </Button>
            </Stack>
          </Stack>
        </Stack>

        <Menu
          anchorEl={settingsAnchor}
          open={Boolean(settingsAnchor)}
          onClose={handleSettingsClose}
        >
          <MenuItem onClick={handleTogglePreload}>
            {enablePreload ? '✓ ' : '  '}Preload samples
          </MenuItem>
          <MenuItem onClick={handleResetPlayStats}>
            Reset play statistics
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
}

export default App;

