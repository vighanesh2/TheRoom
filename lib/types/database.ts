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
  cover_text_color: string;
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
  cover_text_color: string;
  privacy: Privacy;
};

export type UpdateRoomInput = {
  title: string;
  description?: string;
  starts_at: Date;
  location?: string;
  cover_type: CoverType;
  cover_value: string;
  cover_text_color: string;
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

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined';

export type FriendRequest = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendRequestStatus;
  created_at: string;
  responded_at: string | null;
};

export type Friendship = {
  id: string;
  user_a: string;
  user_b: string;
  created_at: string;
};

export type FriendStatus = 'self' | 'none' | 'pending_sent' | 'pending_received' | 'friends';

export type FriendRequestWithProfile = FriendRequest & {
  requester: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>;
};

export type FriendNotification = {
  id: string;
  user_id: string;
  friend_id: string;
  room_id: string;
  read_at: string | null;
  created_at: string;
};

export type FriendNotificationWithDetails = FriendNotification & {
  friend: Pick<RoomMember, 'user_id' | 'display_name' | 'avatar_url'>;
  room: Pick<Room, 'id' | 'title' | 'starts_at'>;
};

export type FriendInRoom = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
};
