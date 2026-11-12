import * as migration_20261112_065742_initial from './20261112_065742_initial';
import * as migration_20261112_071218_workflow from './20261112_071218_workflow';
import * as migration_20261112_073105_records from './20261112_073105_records';
import * as migration_20261112_075241_knowledge from './20261112_075241_knowledge';
import * as migration_20261112_083201_tracker from './20261112_083201_tracker';
import * as migration_20261112_084700_report_dates from './20261112_084700_report_dates';
import * as migration_20261112_092925_home from './20261112_092925_home';
import * as migration_20261112_150948_newsroom from './20261112_150948_newsroom';
import * as migration_20261112_151557_newsroom_variants from './20261112_151557_newsroom_variants';
import * as migration_20261112_155725_schemes from './20261112_155725_schemes';
import * as migration_20261112_164411_opportunities from './20261112_164411_opportunities';
import * as migration_20261112_175006_knowledge_pages from './20261112_175006_knowledge_pages';
import * as migration_20261112_183145_events_submissions from './20261112_183145_events_submissions';
import * as migration_20261112_183156_events_drop_format from './20261112_183156_events_drop_format';

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
    name: '20261112_083201_tracker',
  },
  {
    up: migration_20261112_084700_report_dates.up,
    down: migration_20261112_084700_report_dates.down,
    name: '20261112_084700_report_dates',
  },
  {
    up: migration_20261112_092925_home.up,
    down: migration_20261112_092925_home.down,
    name: '20261112_092925_home',
  },
  {
    up: migration_20261112_150948_newsroom.up,
    down: migration_20261112_150948_newsroom.down,
    name: '20261112_150948_newsroom',
  },
  {
    up: migration_20261112_151557_newsroom_variants.up,
    down: migration_20261112_151557_newsroom_variants.down,
    name: '20261112_151557_newsroom_variants',
  },
  {
    up: migration_20261112_155725_schemes.up,
    down: migration_20261112_155725_schemes.down,
    name: '20261112_155725_schemes',
  },
  {
    up: migration_20261112_164411_opportunities.up,
    down: migration_20261112_164411_opportunities.down,
    name: '20261112_164411_opportunities',
  },
  {
    up: migration_20261112_175006_knowledge_pages.up,
    down: migration_20261112_175006_knowledge_pages.down,
    name: '20261112_175006_knowledge_pages',
  },
  {
    up: migration_20261112_183145_events_submissions.up,
    down: migration_20261112_183145_events_submissions.down,
    name: '20261112_183145_events_submissions',
  },
  {
    up: migration_20261112_183156_events_drop_format.up,
    down: migration_20261112_183156_events_drop_format.down,
    name: '20261112_183156_events_drop_format'
  },
];
