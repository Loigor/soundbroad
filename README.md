# Soundbroad – Audio Soundboard Application

A modern, feature-rich soundboard application built with React, Node.js, and PostgreSQL. Play audio clips instantly or create and play sequences of clips with visual progress tracking.

## Features

- **Instant Playback** – Click any sound to play it immediately with visual feedback
- **Sequence Mode** – Drag clips into a sequence and play them back-to-back with cumulative progress tracking
- **Sound Organization** – Create soundboards (sample groups) and organize clips by tags
- **Search & Discovery** – Find clips by name or tags with live filtering
- **Visual Feedback** – Dynamic waveform visualization, color-coded UI based on clip background colors
- **Duration Display** – View clip length (MM:SS format) for every sound
- **Play Statistics** – Track play counts and frequency for each clip
- **Volume Control** – Master volume slider with immediate feedback
- **Progress Tracking** – Visual progress bar in top menu for both instant and sequence playback
- **Upload Management** – Add new clips with automatic duration detection

## Tech Stack

**Frontend:**
- React 18.3.1 with TypeScript 5.6.3
- Vite 5.4.0 (build tool)
- Material-UI (MUI) 6.1.0 (component library)
- WaveSurfer.js 7.8.6 (waveform visualization)

**Backend:**
- Node.js + Express (REST API)
- PostgreSQL (database)
- node-pg-migrate (database migrations)

**DevOps:**
- Docker + Docker Compose (containerization)
- Nginx (reverse proxy)

## Project Structure

```
soundbroad/
├── frontend/              # React + Vite frontend application
│   ├── src/
│   │   ├── components/   # React components (SampleGrid, SequencePlayer, etc.)
│   │   ├── views/        # Page views (SearchView, SoundboardsView, AddSoundView)
│   │   ├── utils/        # Utilities (colorTheory, audioUtils, playStats)
│   │   ├── api/          # API client and types
│   │   └── main.tsx
│   └── package.json
├── backend/              # Node.js + Express backend
│   ├── src/
│   │   ├── index.ts     # Express API server
│   │   └── db.ts        # Database connection
│   ├── migrations/      # Database schema migrations
│   └── package.json
├── nginx/               # Nginx reverse proxy configuration
├── docker-compose.yml   # Docker Compose orchestration
└── README.md
```

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Or: Node.js 18+, npm, and PostgreSQL

### Quick Start (Docker)

```bash
# Clone and navigate to project
cd soundbroad

# Start all services
docker-compose up --build

# Application will be available at http://localhost
```

The Docker setup starts:
- **Frontend** (Vite dev server) on port 5173 (proxied through nginx)
- **Backend** (Express API) on port 4000 (proxied through nginx)
- **Database** (PostgreSQL) on port 5432
- **Nginx** (reverse proxy) on port 80

### Manual Setup (Development)

1. **Backend Setup**
   ```bash
   cd backend
   npm install
   # Set up .env with database connection
   npm run migrate
   npm run dev
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Database**
   - PostgreSQL must be running
   - Configure connection in `backend/.env`

## Usage

### Search Tab
- Browse all uploaded sounds
- Search by name or tags
- Click any sound to play instantly
- Hear both playback and see progress in the top menu

### Soundboards Tab
- Create and manage soundboards (groups)
- Organize sounds into groups
- **Instant Mode**: Click sounds to play individually
- **Sequence Mode**: Drag sounds to create a playlist, then click Play to play them sequentially

### Add Sound Tab
- Upload new audio files
- Provide name and optional tags
- Color selection for UI customization
- Assign to soundboard on upload (optional)
- Duration is automatically detected

### Playback Modes

**Instant Mode**
- Single clicks play sounds immediately
- Progress shows in top menu bar
- Click Stop to halt playback

**Sequence Mode**
- Build a playlist by adding clips
- Click Play to start sequence
- Progress shows cumulative playback across all clips
- Each clip plays to completion before moving to next
- Click Stop to end sequence

## Key Components

### Frontend Components
- **SampleGrid** – Displays audio clips in a grid with playback controls
- **SequencePlayer** – Manages sequence playback and allows clip removal
- **WaveformPreview** – Visualizes audio waveform using WaveSurfer.js
- **SearchView** – Global sound search and instant playback
- **SoundboardsView** – Soundboard management and sequence creation

### Backend API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/samples` | List all samples (optional `groupId` filter) |
| GET | `/api/samples/{id}/audio` | Stream audio file |
| POST | `/api/samples` | Upload new sample |
| GET | `/api/sample-groups` | List all soundboards |
| POST | `/api/sample-groups` | Create new soundboard |
| POST | `/api/sample-group-members` | Add sample to soundboard |

## Development

### Building

```bash
# Build frontend
cd frontend
npm run build

# Build backend (TypeScript compilation)
cd backend
npm run build
```

### Database Migrations

```bash
cd backend
# Run migrations
npm run migrate

# Create new migration
npm run migrate:create -- --name your_migration_name
```

### Running Tests

Frontend and backend currently have no automated tests set up.

## Environment Variables

### Backend `.env`
```
DATABASE_URL=postgresql://user:password@localhost/soundbroad
PORT=4000
CORS_ORIGIN=http://localhost:5173
FILE_STORAGE_PATH=./storage
```

### Frontend
No `.env` file needed – API client is configured to use relative URLs.

## Performance Notes

- Waveform rendering is cached when possible
- Audio files are streamed from server, not embedded in the response
- Duration calculation happens asynchronously on client-side when needed
- Color theory calculations are pure JavaScript (no external library dependencies)

## Future Enhancements

- Keyboard shortcuts for playback modes
- Sound mixing and effects
- Recording and real-time playback
- Hotkey binding for quick access
- Export sequences as single audio file
- User accounts and personal soundboards
- Analytics dashboard

## License

MIT


