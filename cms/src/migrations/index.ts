import * as migration_20260907_091809_initial from './20260907_091809_initial';
import * as migration_20260907_094724_editorial_content from './20260907_094724_editorial_content';
import * as migration_20260907_121653_media_storage from './20260907_121653_media_storage';
import * as migration_20260908_105018_social_copy_fields from './20260908_105018_social_copy_fields';

export const migrations = [
  {
    up: migration_20260907_091809_initial.up,
    down: migration_20260907_091809_initial.down,
    name: '20260907_091809_initial',
  },
  {
    up: migration_20260907_094724_editorial_content.up,
    down: migration_20260907_094724_editorial_content.down,
    name: '20260907_094724_editorial_content',
  },
  {
    up: migration_20260907_121653_media_storage.up,
    down: migration_20260907_121653_media_storage.down,
    name: '20260907_121653_media_storage',
  },
  {
    up: migration_20260908_105018_social_copy_fields.up,
    down: migration_20260908_105018_social_copy_fields.down,
    name: '20260908_105018_social_copy_fields'
  },
];
