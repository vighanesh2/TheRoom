import type { RoomWithMemberCount } from '@/lib/types/database';

export type DemoRoom = {
  id: string;
  title: string;
  location: string;
  member_count: number;
  starts_at: string;
  coverUri: string;
  members_preview: { display_name: string; avatar_url: string | null }[];
};

const now = new Date();
const tonight = new Date(now);
tonight.setHours(19, 0, 0, 0);

const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(9, 0, 0, 0);

const friday = new Date(now);
friday.setDate(friday.getDate() + ((5 - friday.getDay() + 7) % 7 || 7));
friday.setHours(19, 0, 0, 0);

export const DEMO_ACTIVE: DemoRoom = {
  id: 'demo-active',
  title: 'NYC AI Builders Night',
  location: 'SoHo, New York',
  member_count: 84,
  starts_at: tonight.toISOString(),
  coverUri: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=900&q=80',
  members_preview: [
    { display_name: 'Alex', avatar_url: null },
    { display_name: 'Jordan', avatar_url: null },
    { display_name: 'Sam', avatar_url: null },
    { display_name: 'Riley', avatar_url: null },
  ],
};

export const DEMO_UPCOMING: DemoRoom[] = [
  {
    id: 'demo-upcoming-1',
    title: 'Founder Coffee',
    location: 'Williamsburg, Brooklyn',
    member_count: 32,
    starts_at: tomorrow.toISOString(),
    coverUri: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80',
    members_preview: [
      { display_name: 'Morgan', avatar_url: null },
      { display_name: 'Casey', avatar_url: null },
    ],
  },
  {
    id: 'demo-upcoming-2',
    title: 'Berkeley Hack Night',
    location: 'Berkeley, CA',
    member_count: 58,
    starts_at: friday.toISOString(),
    coverUri: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&q=80',
    members_preview: [
      { display_name: 'Taylor', avatar_url: null },
      { display_name: 'Jamie', avatar_url: null },
      { display_name: 'Quinn', avatar_url: null },
    ],
  },
];

export function isDemoRoomId(id: string) {
  return id.startsWith('demo-');
}

export function roomToCoverUri(room: RoomWithMemberCount): string | null {
  if (room.cover_type === 'image') return room.cover_value;
  return null;
}
