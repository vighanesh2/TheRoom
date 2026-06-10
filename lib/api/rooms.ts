import { supabase } from '@/lib/supabase';
import type {
  CreateRoomInput,
  MiniProfileInput,
  Room,
  RoomMember,
  RoomWithMemberCount,
} from '@/lib/types/database';
import { generateInviteCode } from '@/lib/utils/room-code';

async function uniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode();
    const { data } = await supabase
      .from('rooms')
      .select('id')
      .eq('invite_code', code)
      .maybeSingle();
    if (!data) return code;
  }
  return generateInviteCode(8);
}

export async function createRoom(
  hostId: string,
  input: CreateRoomInput,
  hostProfile: MiniProfileInput
): Promise<Room> {
  const inviteCode = await uniqueInviteCode();

  const { data: room, error } = await supabase
    .from('rooms')
    .insert({
      host_id: hostId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      starts_at: input.starts_at.toISOString(),
      location: input.location?.trim() || null,
      cover_type: input.cover_type,
      cover_value: input.cover_value,
      privacy: input.privacy,
      invite_code: inviteCode,
    })
    .select()
    .single();

  if (error) throw error;

  const { error: memberError } = await supabase.from('room_members').insert({
    room_id: room.id,
    user_id: hostId,
    role: 'host',
    display_name: hostProfile.display_name,
    avatar_url: hostProfile.avatar_url || null,
    headline: hostProfile.headline || null,
    building: hostProfile.building || null,
    looking_for: hostProfile.looking_for || null,
    can_help_with: hostProfile.can_help_with || null,
    linkedin_url: hostProfile.linkedin_url || null,
  });

  if (memberError) throw memberError;

  return room;
}

export async function getRoomById(roomId: string): Promise<Room | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getRoomByInviteCode(code: string): Promise<Room | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('invite_code', code.toUpperCase())
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getMyRooms(userId: string): Promise<RoomWithMemberCount[]> {
  const { data: memberships, error: memberError } = await supabase
    .from('room_members')
    .select('room_id')
    .eq('user_id', userId);

  if (memberError) throw memberError;
  if (!memberships?.length) return [];

  const roomIds = memberships.map((m) => m.room_id);

  const { data: rooms, error } = await supabase
    .from('rooms')
    .select('*')
    .in('id', roomIds)
    .order('starts_at', { ascending: true });

  if (error) throw error;

  const withCounts = await Promise.all(
    (rooms ?? []).map(async (room) => {
      const { count } = await supabase
        .from('room_members')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', room.id);

      const { data: preview } = await supabase
        .from('room_members')
        .select('*')
        .eq('room_id', room.id)
        .order('joined_at', { ascending: true })
        .limit(4);

      return {
        ...room,
        member_count: count ?? 0,
        members_preview: preview ?? [],
      };
    })
  );

  return withCounts;
}

export async function getRoomMembers(roomId: string): Promise<RoomMember[]> {
  const { data, error } = await supabase
    .from('room_members')
    .select('*')
    .eq('room_id', roomId)
    .order('joined_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getMembership(
  roomId: string,
  userId: string
): Promise<RoomMember | null> {
  const { data, error } = await supabase
    .from('room_members')
    .select('*')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function joinRoom(
  roomId: string,
  userId: string,
  profile: MiniProfileInput
): Promise<RoomMember> {
  const { data, error } = await supabase
    .from('room_members')
    .insert({
      room_id: roomId,
      user_id: userId,
      role: 'attendee',
      display_name: profile.display_name.trim(),
      avatar_url: profile.avatar_url || null,
      headline: profile.headline?.trim() || null,
      building: profile.building?.trim() || null,
      looking_for: profile.looking_for?.trim() || null,
      can_help_with: profile.can_help_with?.trim() || null,
      linkedin_url: profile.linkedin_url?.trim() || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function uploadAvatar(
  userId: string,
  uri: string,
  mimeType = 'image/jpeg'
): Promise<string> {
  const ext = mimeType.split('/')[1] ?? 'jpg';
  const path = `avatars/${userId}/${Date.now()}.${ext}`;

  const response = await fetch(uri);
  const blob = await response.blob();
  const arrayBuffer = await new Response(blob).arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from('room-assets')
    .upload(path, arrayBuffer, { contentType: mimeType, upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('room-assets').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadCoverImage(
  userId: string,
  uri: string,
  mimeType = 'image/jpeg'
): Promise<string> {
  const ext = mimeType.split('/')[1] ?? 'jpg';
  const path = `covers/${userId}/${Date.now()}.${ext}`;

  const response = await fetch(uri);
  const blob = await response.blob();
  const arrayBuffer = await new Response(blob).arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from('room-assets')
    .upload(path, arrayBuffer, { contentType: mimeType, upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('room-assets').getPublicUrl(path);
  return data.publicUrl;
}
