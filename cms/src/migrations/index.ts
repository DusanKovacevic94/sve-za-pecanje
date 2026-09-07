import * as migration_20260907_091809_initial from './20260907_091809_initial';

export const migrations = [
  {
    up: migration_20260907_091809_initial.up,
    down: migration_20260907_091809_initial.down,
    name: '20260907_091809_initial'
  },
];
