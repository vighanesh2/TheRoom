import { supabase } from '@/lib/supabase';
import type {
  FriendInRoom,
  FriendNotificationWithDetails,
  FriendRequestWithProfile,
  FriendStatus,
  RoomMember,
} from '@/lib/types/database';

function orderPair(userId: string, otherId: string): [string, string] {
  return userId < otherId ? [userId, otherId] : [otherId, userId];
}

export async function getFriendStatus(
  currentUserId: string,
  otherUserId: string
): Promise<{ status: FriendStatus; requestId?: string }> {
  if (currentUserId === otherUserId) return { status: 'self' };

  const [userA, userB] = orderPair(currentUserId, otherUserId);
  const { data: friendship } = await supabase
    .from('friendships')
    .select('id')
    .eq('user_a', userA)
    .eq('user_b', userB)
    .maybeSingle();

  if (friendship) return { status: 'friends' };

  const { data: sent } = await supabase
    .from('friend_requests')
    .select('id, status')
    .eq('requester_id', currentUserId)
    .eq('addressee_id', otherUserId)
    .maybeSingle();

  if (sent?.status === 'pending') return { status: 'pending_sent', requestId: sent.id };

  const { data: received } = await supabase
    .from('friend_requests')
    .select('id, status')
    .eq('requester_id', otherUserId)
    .eq('addressee_id', currentUserId)
    .maybeSingle();

  if (received?.status === 'pending') {
    return { status: 'pending_received', requestId: received.id };
  }

  return { status: 'none' };
}

async function createFriendship(userId: string, friendId: string): Promise<void> {
  const [userA, userB] = orderPair(userId, friendId);
  const { error } = await supabase.from('friendships').insert({ user_a: userA, user_b: userB });
  if (error && error.code !== '23505') throw error;
}

export async function sendFriendRequest(
  requesterId: string,
  addresseeId: string
): Promise<FriendStatus> {
  if (requesterId === addresseeId) throw new Error('You cannot add yourself as a friend.');

  const existing = await getFriendStatus(requesterId, addresseeId);
  if (existing.status === 'friends') return 'friends';
  if (existing.status === 'pending_sent') return 'pending_sent';
  if (existing.status === 'pending_received' && existing.requestId) {
    await acceptFriendRequest(existing.requestId, addresseeId);
    return 'friends';
  }

  const { error } = await supabase.from('friend_requests').insert({
    requester_id: requesterId,
    addressee_id: addresseeId,
    status: 'pending',
  });

  if (error) {
    if (error.code === '23505') return 'pending_sent';
    throw error;
  }

  return 'pending_sent';
}

export async function acceptFriendRequest(requestId: string, addresseeId: string): Promise<void> {
  const { data: request, error: fetchError } = await supabase
    .from('friend_requests')
    .select('*')
    .eq('id', requestId)
    .eq('addressee_id', addresseeId)
    .eq('status', 'pending')
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!request) throw new Error('Friend request not found.');

  const { error: updateError } = await supabase
    .from('friend_requests')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', requestId);

  if (updateError) throw updateError;
  await createFriendship(request.requester_id, request.addressee_id);
}

export async function declineFriendRequest(requestId: string, addresseeId: string): Promise<void> {
  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'declined', responded_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('addressee_id', addresseeId)
    .eq('status', 'pending');

  if (error) throw error;
}

export async function getPendingFriendRequests(
  userId: string
): Promise<FriendRequestWithProfile[]> {
  const { data, error } = await supabase
    .from('friend_requests')
    .select(
      `
      id,
      requester_id,
      addressee_id,
      status,
      created_at,
      responded_at,
      requester:profiles!friend_requests_requester_id_fkey(id, full_name, avatar_url)
    `
    )
    .eq('addressee_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    ...row,
    requester: Array.isArray(row.requester) ? row.requester[0] : row.requester,
  })) as FriendRequestWithProfile[];
}

export async function getFriendIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select('user_a, user_b')
    .or(`user_a.eq.${userId},user_b.eq.${userId}`);

  if (error) throw error;

  return (data ?? []).map((row) => (row.user_a === userId ? row.user_b : row.user_a));
}

export async function getFriendsInRoom(
  roomId: string,
  userId: string,
  members?: RoomMember[]
): Promise<FriendInRoom[]> {
  const friendIds = await getFriendIds(userId);
  if (friendIds.length === 0) return [];

  if (members) {
    return members
      .filter((m) => friendIds.includes(m.user_id))
      .map((m) => ({
        user_id: m.user_id,
        display_name: m.display_name,
        avatar_url: m.avatar_url,
      }));
  }

  const { data, error } = await supabase
    .from('room_members')
    .select('user_id, display_name, avatar_url')
    .eq('room_id', roomId)
    .in('user_id', friendIds);

  if (error) throw error;

  return (data ?? []).map((m) => ({
    user_id: m.user_id,
    display_name: m.display_name,
    avatar_url: m.avatar_url,
  }));
}

export async function notifyFriendsInRoom(userId: string, roomId: string): Promise<void> {
  const friendIds = await getFriendIds(userId);
  if (friendIds.length === 0) return;

  const { data: friendsInRoom, error } = await supabase
    .from('room_members')
    .select('user_id')
    .eq('room_id', roomId)
    .in('user_id', friendIds);

  if (error) throw error;
  if (!friendsInRoom?.length) return;

  const rows = friendsInRoom.flatMap((friend) => [
    { user_id: userId, friend_id: friend.user_id, room_id: roomId },
    { user_id: friend.user_id, friend_id: userId, room_id: roomId },
  ]);

  const { error: insertError } = await supabase
    .from('friend_notifications')
    .upsert(rows, { onConflict: 'user_id,friend_id,room_id', ignoreDuplicates: true });

  if (insertError) throw insertError;
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('friend_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) throw error;
  return count ?? 0;
}

export async function getFriendNotifications(
  userId: string
): Promise<FriendNotificationWithDetails[]> {
  const { data, error } = await supabase
    .from('friend_notifications')
    .select(
      `
      id,
      user_id,
      friend_id,
      room_id,
      read_at,
      created_at,
      room:rooms!friend_notifications_room_id_fkey(id, title, starts_at)
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  if (!data?.length) return [];

  const friendIds = [...new Set(data.map((n) => n.friend_id))];
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', friendIds);

  if (profileError) throw profileError;

  const profileMap = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      {
        user_id: p.id,
        display_name: p.full_name ?? 'Friend',
        avatar_url: p.avatar_url,
      },
    ])
  );

  return data.map((row) => {
    const friend = profileMap.get(row.friend_id) ?? {
      user_id: row.friend_id,
      display_name: 'Friend',
      avatar_url: null,
    };
    const roomRaw = row.room;
    const room = (Array.isArray(roomRaw) ? roomRaw[0] : roomRaw) as FriendNotificationWithDetails['room'];
    return {
      id: row.id,
      user_id: row.user_id,
      friend_id: row.friend_id,
      room_id: row.room_id,
      read_at: row.read_at,
      created_at: row.created_at,
      friend,
      room,
    };
  });
}

export async function markNotificationsRead(userId: string, notificationIds?: string[]): Promise<void> {
  let query = supabase
    .from('friend_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);

  if (notificationIds?.length) {
    query = query.in('id', notificationIds);
  }

  const { error } = await query;
  if (error) throw error;
}

export async function getFriendCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('friendships')
    .select('*', { count: 'exact', head: true })
    .or(`user_a.eq.${userId},user_b.eq.${userId}`);

  if (error) throw error;
  return count ?? 0;
}
