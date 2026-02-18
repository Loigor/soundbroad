import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import * as db from './db';

const app = express();

const PORT = Number(process.env.PORT) || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
const FILE_STORAGE_PATH =
  process.env.FILE_STORAGE_PATH || path.join(__dirname, '..', 'storage');

if (!fs.existsSync(FILE_STORAGE_PATH)) {
  fs.mkdirSync(FILE_STORAGE_PATH, { recursive: true });
}

// Parse CORS_ORIGIN - can be comma-separated for multiple origins
const corsOrigins = CORS_ORIGIN.split(',').map(origin => origin.trim());

app.use(cors({ origin: corsOrigins }));
app.use(express.json());

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, FILE_STORAGE_PATH);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({ storage });

interface SampleRow {
  id: string;
  name: string;
  file_path: string;
  duration_seconds: number | null;
  tags: string[] | null;
  color: string | null;
}

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Create sample (with file upload, tags, and optional group IDs)
app.post(
  '/api/samples',
  upload.single('file'),
  async (req: Request, res: Response) => {
    const client = await db.pool.connect();
    try {
      const { name, tags, groupIds, durationSeconds, color } = req.body as {
        name?: string;
        tags?: string | string[];
        groupIds?: string | string[];
        durationSeconds?: string;
        color?: string;
      };

      if (!name || !req.file) {
        return res.status(400).json({ error: 'Name and file are required' });
      }

      const sampleId = uuidv4();
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO samples (id, name, file_path, duration_seconds, color)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          sampleId,
          name,
          req.file.filename,
          durationSeconds ? Number(durationSeconds) : null,
          color || null
        ]
      );

      if (tags) {
        const tagList = Array.isArray(tags)
          ? tags
          : String(tags)
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean);
        for (const tagName of tagList) {
          let tagRes = await client.query<{ id: number }>(
            'SELECT id FROM tags WHERE name = $1',
            [tagName]
          );
          if (tagRes.rows.length === 0) {
            tagRes = await client.query<{ id: number }>(
              'INSERT INTO tags (name) VALUES ($1) RETURNING id',
              [tagName]
            );
          }
          const tagId = tagRes.rows[0].id;
          await client.query(
            'INSERT INTO sample_tags (sample_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [sampleId, tagId]
          );
        }
      }

      if (groupIds) {
        const groups = Array.isArray(groupIds)
          ? groupIds
          : String(groupIds)
              .split(',')
              .map((g) => g.trim())
              .filter(Boolean);
        for (const groupId of groups) {
          await client.query(
            'INSERT INTO sample_group_samples (group_id, sample_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [groupId, sampleId]
          );
        }
      }

      await client.query('COMMIT');

      return res.status(201).json({ id: sampleId });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(err);
      return res.status(500).json({ error: 'Failed to create sample' });
    } finally {
      client.release();
    }
  }
);

// List samples with optional filters: groupId, search (name or tags)
app.get('/api/samples', async (req: Request, res: Response) => {
  const { groupId, search } = req.query as {
    groupId?: string;
    search?: string;
  };

  const params: any[] = [];
  const whereClauses: string[] = [];
  const joins = `
    LEFT JOIN sample_group_samples sgs ON sgs.sample_id = s.id
    LEFT JOIN sample_tags st ON st.sample_id = s.id
    LEFT JOIN tags t ON t.id = st.tag_id
  `;

  if (groupId) {
    params.push(groupId);
    whereClauses.push(`sgs.group_id = $${params.length}`);
  }

  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    whereClauses.push(
      `(LOWER(s.name) LIKE $${params.length} OR LOWER(t.name) LIKE $${params.length})`
    );
  }

  const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const sql = `
    SELECT
      s.id,
      s.name,
      s.file_path,
      s.duration_seconds,
      s.color,
      COALESCE(
        json_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL),
        '[]'
      ) AS tags
    FROM samples s
    ${joins}
    ${where}
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `;

  try {
    const result = await db.query<SampleRow>(sql, params);
    return res.json(
      result.rows.map((row) => ({
        ...row,
        tags: row.tags ?? []
      }))
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load samples' });
  }
});

// Stream audio file
app.get('/api/samples/:id/audio', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await db.query<{ file_path: string }>(
      'SELECT file_path FROM samples WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sample not found' });
    }
    const filePath = path.join(FILE_STORAGE_PATH, result.rows[0].file_path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    return res.sendFile(filePath);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to stream audio' });
  }
});

// Sample groups
app.get('/api/sample-groups', async (_req: Request, res: Response) => {
  try {
    const result = await db.query<{ id: string; name: string; created_at: string }>(
      'SELECT id, name, created_at FROM sample_groups ORDER BY created_at DESC'
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load sample groups' });
  }
});

app.post('/api/sample-groups', async (req: Request, res: Response) => {
  try {
    const { name } = req.body as { name?: string };
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const id = uuidv4();
    await db.query('INSERT INTO sample_groups (id, name) VALUES ($1, $2)', [id, name]);
    return res.status(201).json({ id, name });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create sample group' });
  }
});

// Add a sample to a group
app.post(
  '/api/sample-groups/:groupId/samples/:sampleId',
  async (req: Request, res: Response) => {
    try {
      const { groupId, sampleId } = req.params;
      await db.query(
        'INSERT INTO sample_group_samples (group_id, sample_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [groupId, sampleId]
      );
      return res.status(204).end();
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to add sample to group' });
    }
  }
);

// Remove a sample from a group
app.delete(
  '/api/sample-groups/:groupId/samples/:sampleId',
  async (req: Request, res: Response) => {
    try {
      const { groupId, sampleId } = req.params;
      await db.query(
        'DELETE FROM sample_group_samples WHERE group_id = $1 AND sample_id = $2',
        [groupId, sampleId]
      );
      return res.status(204).end();
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to remove sample from group' });
    }
  }
);

// Update sample (name, color)
app.put('/api/samples/:id', async (req: Request, res: Response) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const { name, color, tags } = req.body as { name?: string; color?: string; tags?: string[] };

    if (!name && color === undefined && !tags) {
      return res.status(400).json({ error: 'Name, color, or tags required' });
    }

    // Check if sample exists
    const checkRes = await client.query('SELECT id FROM samples WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Sample not found' });
    }

    await client.query('BEGIN');

    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (name) {
      updates.push(`name = $${paramCount}`);
      params.push(name);
      paramCount++;
    }

    if (color !== undefined) {
      updates.push(`color = $${paramCount}`);
      params.push(color || null);
      paramCount++;
    }

    if (updates.length > 0) {
      params.push(id);
      await client.query(`UPDATE samples SET ${updates.join(', ')} WHERE id = $${paramCount}`, params);
    }

    // Handle tags if provided
    if (tags) {
      // Delete existing tags
      await client.query('DELETE FROM sample_tags WHERE sample_id = $1', [id]);
      
      // Insert new tags
      if (tags.length > 0) {
        const tagValues = tags.map((tag, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(', ');
        const tagParams = tags.flatMap((tag) => [id, tag]);
        await client.query(
          `INSERT INTO sample_tags (sample_id, tag) VALUES ${tagValues}`,
          tagParams
        );
      }
    }

    await client.query('COMMIT');
    return res.status(204).end();
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    return res.status(500).json({ error: 'Failed to update sample' });
  } finally {
    client.release();
  }
});

// Delete sample (file and database record)
app.delete('/api/samples/:id', async (req: Request, res: Response) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;

    // Get file path
    const result = await client.query<{ file_path: string }>(
      'SELECT file_path FROM samples WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sample not found' });
    }

    const filePath = path.join(FILE_STORAGE_PATH, result.rows[0].file_path);

    await client.query('BEGIN');

    // Delete from database
    await client.query('DELETE FROM sample_tags WHERE sample_id = $1', [id]);
    await client.query('DELETE FROM sample_group_samples WHERE sample_id = $1', [id]);
    await client.query('DELETE FROM samples WHERE id = $1', [id]);

    await client.query('COMMIT');

    // Delete file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return res.status(204).end();
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete sample' });
  } finally {
    client.release();
  }
});

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});

