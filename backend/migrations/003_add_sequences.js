'use strict';

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.createTable('sequences', {
    id: 'uuid',
    group_id: {
      type: 'uuid',
      notNull: true,
      references: 'sample_groups',
      onDelete: 'cascade'
    },
    name: { type: 'text', notNull: true },
    sequence_data: {
      type: 'jsonb',
      notNull: true,
      default: pgm.func("'[]'::jsonb")
    },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') }
  });
  pgm.addConstraint('sequences', 'sequences_pk', { primaryKey: 'id' });
  pgm.createIndex('sequences', 'group_id');
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('sequences');
};
