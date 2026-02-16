'use strict';

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.createTable('samples', {
    id: 'uuid',
    name: { type: 'text', notNull: true },
    file_path: { type: 'text', notNull: true },
    duration_seconds: { type: 'numeric', notNull: false },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') }
  });
  pgm.addConstraint('samples', 'samples_pk', { primaryKey: 'id' });

  pgm.createTable('tags', {
    id: 'serial',
    name: { type: 'text', notNull: true, unique: true }
  });
  pgm.addConstraint('tags', 'tags_pk', { primaryKey: 'id' });

  pgm.createTable('sample_tags', {
    sample_id: {
      type: 'uuid',
      notNull: true,
      references: 'samples',
      onDelete: 'cascade'
    },
    tag_id: {
      type: 'integer',
      notNull: true,
      references: 'tags',
      onDelete: 'cascade'
    }
  });
  pgm.addConstraint('sample_tags', 'sample_tags_pk', {
    primaryKey: ['sample_id', 'tag_id']
  });

  pgm.createTable('sample_groups', {
    id: 'uuid',
    name: { type: 'text', notNull: true },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') }
  });
  pgm.addConstraint('sample_groups', 'sample_groups_pk', { primaryKey: 'id' });

  pgm.createTable('sample_group_samples', {
    group_id: {
      type: 'uuid',
      notNull: true,
      references: 'sample_groups',
      onDelete: 'cascade'
    },
    sample_id: {
      type: 'uuid',
      notNull: true,
      references: 'samples',
      onDelete: 'cascade'
    }
  });
  pgm.addConstraint('sample_group_samples', 'sample_group_samples_pk', {
    primaryKey: ['group_id', 'sample_id']
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('sample_group_samples');
  pgm.dropTable('sample_groups');
  pgm.dropTable('sample_tags');
  pgm.dropTable('tags');
  pgm.dropTable('samples');
};

