export const Permission = {
  ADMINISTRATOR: 1 << 0,
  MANAGE_GUILD: 1 << 1,
  MANAGE_CHANNELS: 1 << 2,
  VIEW_CHANNEL: 1 << 3,
  SEND_MESSAGES: 1 << 4,
  CONNECT_VOICE: 1 << 5,
  SPEAK_VOICE: 1 << 6,
} as const;

export type PermissionFlag = (typeof Permission)[keyof typeof Permission];

export const EVERYONE_PERMISSIONS =
  Permission.VIEW_CHANNEL |
  Permission.SEND_MESSAGES |
  Permission.CONNECT_VOICE |
  Permission.SPEAK_VOICE;

export function hasPermission(granted: number, required: number): boolean {
  if ((granted & Permission.ADMINISTRATOR) !== 0) {
    return true;
  }
  return (granted & required) === required;
}
