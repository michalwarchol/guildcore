import { createMigrationDataSourceOptions } from './data-source-options';

describe('createMigrationDataSourceOptions', () => {
  it('keeps schema changes on explicit migrations', () => {
    expect(
      createMigrationDataSourceOptions(
        'postgresql://guildcore:guildcore_dev@localhost:5432/guildcore',
      ),
    ).toMatchObject({
      type: 'postgres',
      synchronize: false,
      migrations: ['src/database/migrations/*.ts'],
    });
  });
});
