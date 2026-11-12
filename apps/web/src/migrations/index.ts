import * as migration_20261112_065742_initial from './20261112_065742_initial';
import * as migration_20261112_071218_workflow from './20261112_071218_workflow';
import * as migration_20261112_073105_records from './20261112_073105_records';
import * as migration_20261112_075241_knowledge from './20261112_075241_knowledge';
import * as migration_20261112_083201_tracker from './20261112_083201_tracker';

export const migrations = [
  {
    up: migration_20261112_065742_initial.up,
    down: migration_20261112_065742_initial.down,
    name: '20261112_065742_initial',
  },
  {
    up: migration_20261112_071218_workflow.up,
    down: migration_20261112_071218_workflow.down,
    name: '20261112_071218_workflow',
  },
  {
    up: migration_20261112_073105_records.up,
    down: migration_20261112_073105_records.down,
    name: '20261112_073105_records',
  },
  {
    up: migration_20261112_075241_knowledge.up,
    down: migration_20261112_075241_knowledge.down,
    name: '20261112_075241_knowledge',
  },
  {
    up: migration_20261112_083201_tracker.up,
    down: migration_20261112_083201_tracker.down,
    name: '20261112_083201_tracker'
  },
];
