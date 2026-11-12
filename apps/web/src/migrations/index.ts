import * as migration_20261112_065742_initial from './20261112_065742_initial';
import * as migration_20261112_071218_workflow from './20261112_071218_workflow';

export const migrations = [
  {
    up: migration_20261112_065742_initial.up,
    down: migration_20261112_065742_initial.down,
    name: '20261112_065742_initial',
  },
  {
    up: migration_20261112_071218_workflow.up,
    down: migration_20261112_071218_workflow.down,
    name: '20261112_071218_workflow'
  },
];
