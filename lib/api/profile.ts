import type { User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { Profile, RoomMember, MiniProfileInput } from '@/lib/types/database';

/** Creates a profiles row if the auth trigger did not (required before joining rooms). */
export async function ensureUserProfile(user: User): Promise<void> {
  const { data: existing, error: readError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (readError) throw readError;
  if (existing) return;

  const fullName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split('@')[0] ??
    'User';

  const { error: insertError } = await supabase.from('profiles').insert({
    id: user.id,
    email: user.email ?? null,
    full_name: fullName,
  });

  if (insertError) throw insertError;
}

export async function getUserProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getLatestMembershipProfile(userId: string): Promise<RoomMember | null> {
  const { data, error } = await supabase
    .from('room_members')
    .select('*')
    .eq('user_id', userId)
    .order('joined_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** Room join defaults from the user's most recent membership, then auth profile. */
export async function getSavedJoinProfile(userId: string): Promise<MiniProfileInput | null> {
  const [membership, profile] = await Promise.all([
    getLatestMembershipProfile(userId),
    getUserProfile(userId),
  ]);

  if (membership?.display_name?.trim()) {
    return {
      display_name: membership.display_name.trim(),
      avatar_url: membership.avatar_url ?? profile?.avatar_url ?? undefined,
      headline: membership.headline ?? undefined,
      building: membership.building ?? undefined,
      looking_for: membership.looking_for ?? undefined,
      can_help_with: membership.can_help_with ?? undefined,
      linkedin_url: membership.linkedin_url ?? undefined,
    };
  }

  const name = profile?.full_name?.trim();
  if (!name) return null;

  return {
    display_name: name,
    avatar_url: profile.avatar_url ?? undefined,
  };
}

/** Updates room intro fields on every membership for this user, plus global name/avatar. */
export async function updateMembershipProfile(
  userId: string,
  profile: MiniProfileInput
): Promise<void> {
  const payload = {
    display_name: profile.display_name.trim(),
    avatar_url: profile.avatar_url || null,
    headline: profile.headline?.trim() || null,
    building: profile.building?.trim() || null,
    looking_for: profile.looking_for?.trim() || null,
    can_help_with: profile.can_help_with?.trim() || null,
    linkedin_url: profile.linkedin_url?.trim() || null,
  };

  const { error: membershipError } = await supabase
    .from('room_members')
    .update(payload)
    .eq('user_id', userId);

  if (membershipError) throw membershipError;

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name: profile.display_name.trim(),
      avatar_url: profile.avatar_url || null,
    })
    .eq('id', userId);

  if (profileError) throw profileError;
}
