## Soundbroad – Dockerized React + Node Soundboard

This is a minimal but structured soundboard application built with:

- React + Vite (frontend)
- Material UI for UI components
- Node.js + Express (backend)
- PostgreSQL (database)
- `node-pg-migrate` for schema migrations
- Docker + docker-compose for local development

### Features

- Upload audio samples (files) with name and tags.
- Define sample groups and assign samples to groups.
- Browse samples in a grid either:
  - By selected sample group, or
  - By searching by name or tags.
- Click a sample tile to play it.
- Shows a playing indicator and a simple waveform visualization.

### Project Structure

- `frontend/` – React + Vite + MUI UI
- `backend/` – Express API, migrations, and DB access
- `docker-compose.yml` – Orchestrates frontend, backend, and Postgres

### Getting Started (non-Docker)

1. Install dependencies:

   - Frontend:

     ```bash
     cd frontend
     npm install
     ```

   - Backend:

     ```bash
     cd backend
     npm install
     ```

2. Start Postgres separately or via Docker and set the backend `.env` file (see `backend/.env.example`).

3. Run DB migrations:

   ```bash
   cd backend
   npm run migrate
   ```

4. Start dev servers:

   - Backend: `npm run dev`
   - Frontend: `npm run dev`

### Running with Docker (development)

From the project root:

```bash
docker compose up --build
```

This will start:

- `db` – PostgreSQL
- `backend` – Node/Express with hot reload
- `frontend` – Vite dev server with hot reload

### Notes

- The backend stores audio files on disk (inside the container volume) and keeps metadata in Postgres.
- The waveform is rendered on the client using the Web Audio API and `<canvas>`, keeping external dependencies minimal.

