import {
  differenceInHours,
  format,
  isFuture,
  isToday,
  isTomorrow,
  parseISO,
} from 'date-fns';

import type { RoomWithMemberCount } from '@/lib/types/database';

const ACTIVE_WINDOW_HOURS = 8;

export function isRoomLive(startsAt: string): boolean {
  const start = parseISO(startsAt);
  const now = new Date();

  if (start.getTime() > now.getTime()) return false;

  const hoursSinceStart = differenceInHours(now, start);
  return hoursSinceStart <= ACTIVE_WINDOW_HOURS;
}

export function categorizeRooms(rooms: RoomWithMemberCount[]) {
  const active: RoomWithMemberCount[] = [];
  const upcoming: RoomWithMemberCount[] = [];

  for (const room of rooms) {
    if (isRoomLive(room.starts_at)) {
      active.push(room);
    } else if (isFuture(parseISO(room.starts_at))) {
      upcoming.push(room);
    }
  }

  active.sort(
    (a, b) => parseISO(a.starts_at).getTime() - parseISO(b.starts_at).getTime()
  );
  upcoming.sort(
    (a, b) => parseISO(a.starts_at).getTime() - parseISO(b.starts_at).getTime()
  );

  return { active, upcoming };
}

export function formatRoomSchedule(startsAt: string): string {
  const date = parseISO(startsAt);
  const time = format(date, 'h:mm a');

  if (isRoomLive(startsAt)) return 'Live now';
  if (isToday(date)) return `Today · ${time}`;
  if (isTomorrow(date)) return `Tomorrow · ${time}`;
  return `${format(date, 'EEEE')} · ${time}`;
}

export function formatStartedTime(startsAt: string): string {
  return `Started ${format(parseISO(startsAt), 'h:mm a')}`;
}

export function parseInviteCodeFromScan(data: string): string | null {
  const trimmed = data.trim();
  const segments = trimmed.split('/').filter(Boolean);
  const last = segments[segments.length - 1];

  if (last && /^[A-Z0-9]{6,8}$/i.test(last)) {
    return last.toUpperCase();
  }

  if (/^[A-Z0-9]{6,8}$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  return null;
}
