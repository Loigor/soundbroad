/** @type {import('node-pg-migrate').RunnerOption} */
module.exports = {
  migrationsTable: "pgmigrations",
  dir: "migrations",
  direction: "up",
  databaseUrl: {
    host: process.env.PGHOST || "localhost",
    port: Number(process.env.PGPORT) || 5432,
    user: process.env.PGUSER || "soundbroad",
    password: process.env.PGPASSWORD || "soundbroad",
    database: process.env.PGDATABASE || "soundbroad"
  }
};

