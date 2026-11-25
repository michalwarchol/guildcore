import { EVERYONE_PERMISSIONS, Permission, hasPermission } from './permissions';

describe('hasPermission', () => {
  it('lets an administrator pass every check', () => {
    for (const flag of Object.values(Permission)) {
      expect(hasPermission(Permission.ADMINISTRATOR, flag)).toBe(true);
    }
  });

  it('denies a flag the member does not have', () => {
    expect(hasPermission(EVERYONE_PERMISSIONS, Permission.MANAGE_CHANNELS)).toBe(
      false,
    );
    expect(hasPermission(EVERYONE_PERMISSIONS, Permission.VIEW_CHANNEL)).toBe(
      true,
    );
  });
});
