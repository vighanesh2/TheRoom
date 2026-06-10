export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type CoverType = 'image' | 'color' | 'gradient';
export type Privacy = 'public' | 'private';
export type MemberRole = 'host' | 'attendee';

export type Room = {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  location: string | null;
  cover_type: CoverType;
  cover_value: string;
  privacy: Privacy;
  invite_code: string;
  created_at: string;
  updated_at: string;
};

export type RoomMember = {
  id: string;
  room_id: string;
  user_id: string;
  role: MemberRole;
  display_name: string;
  avatar_url: string | null;
  headline: string | null;
  building: string | null;
  looking_for: string | null;
  can_help_with: string | null;
  linkedin_url: string | null;
  joined_at: string;
};

export type RoomInvite = {
  id: string;
  room_id: string;
  invite_code: string;
  created_by: string;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  created_at: string;
};

export type CreateRoomInput = {
  title: string;
  description?: string;
  starts_at: Date;
  location?: string;
  cover_type: CoverType;
  cover_value: string;
  privacy: Privacy;
};

export type MiniProfileInput = {
  display_name: string;
  avatar_url?: string;
  headline?: string;
  building?: string;
  looking_for?: string;
  can_help_with?: string;
  linkedin_url?: string;
};

export type RoomWithMemberCount = Room & {
  member_count: number;
  members_preview?: RoomMember[];
};
