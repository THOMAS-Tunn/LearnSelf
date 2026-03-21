import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_USER_NAME, FRIENDSHIPS_TABLE, PROFILES_TABLE } from '../constants';
import type { DirectoryProfile, FriendRecord, FriendSearchResult, UserProfile } from '../types';

interface ProfileRow {
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface FriendshipRow {
  id: string;
  user_low_id: string;
  user_high_id: string;
  created_at: string | null;
}

function getDisplayName(name: string, email: string) {
  return name.trim() || email.split('@')[0] || DEFAULT_USER_NAME;
}

function mapDirectoryProfileFromRow(row: ProfileRow): DirectoryProfile {
  return {
    userId: row.user_id,
    name: getDisplayName(row.display_name || '', row.email || ''),
    email: row.email || '',
    avatarUrl: row.avatar_url || ''
  };
}

function getFriendPair(userId: string, friendUserId: string) {
  return userId < friendUserId
    ? { userLowId: userId, userHighId: friendUserId }
    : { userLowId: friendUserId, userHighId: userId };
}

function getProfileScore(profile: DirectoryProfile, normalizedQuery: string) {
  const normalizedName = profile.name.toLowerCase();
  const normalizedEmail = profile.email.toLowerCase();

  if (normalizedEmail === normalizedQuery) return 5;
  if (normalizedName === normalizedQuery) return 4;
  if (normalizedEmail.startsWith(normalizedQuery)) return 3;
  if (normalizedName.startsWith(normalizedQuery)) return 2;
  return 1;
}

export async function syncUserDirectoryProfile(client: SupabaseClient, profile: UserProfile): Promise<UserProfile> {
  const { data: existing, error: selectError } = await client
    .from(PROFILES_TABLE)
    .select('user_id, display_name, email, avatar_url')
    .eq('user_id', profile.id)
    .maybeSingle();

  if (selectError) throw selectError;

  const mergedProfile: UserProfile = {
    id: profile.id,
    name: getDisplayName(profile.name || existing?.display_name || '', profile.email || existing?.email || ''),
    email: profile.email.trim() || existing?.email || '',
    avatarUrl: profile.avatarUrl.trim() || existing?.avatar_url || ''
  };

  const { error: upsertError } = await client.from(PROFILES_TABLE).upsert({
    user_id: mergedProfile.id,
    display_name: mergedProfile.name,
    email: mergedProfile.email,
    avatar_url: mergedProfile.avatarUrl || null
  }, {
    onConflict: 'user_id'
  });

  if (upsertError) throw upsertError;
  return mergedProfile;
}

export async function fetchFriends(client: SupabaseClient, currentUserId: string): Promise<FriendRecord[]> {
  const { data: friendshipRows, error: friendshipError } = await client
    .from(FRIENDSHIPS_TABLE)
    .select('id, user_low_id, user_high_id, created_at')
    .or(`user_low_id.eq.${currentUserId},user_high_id.eq.${currentUserId}`)
    .order('created_at', { ascending: true });

  if (friendshipError) throw friendshipError;

  const rows = (friendshipRows || []) as FriendshipRow[];
  if (!rows.length) return [] satisfies FriendRecord[];

  const friendIds = rows.map((row) => row.user_low_id === currentUserId ? row.user_high_id : row.user_low_id);
  const { data: profileRows, error: profileError } = await client
    .from(PROFILES_TABLE)
    .select('user_id, display_name, email, avatar_url')
    .in('user_id', friendIds);

  if (profileError) throw profileError;

  const profilesById = new Map<string, DirectoryProfile>();
  for (const row of profileRows || []) {
    const profile = mapDirectoryProfileFromRow(row as ProfileRow);
    profilesById.set(profile.userId, profile);
  }

  return rows
    .map((row) => {
      const friendUserId = row.user_low_id === currentUserId ? row.user_high_id : row.user_low_id;
      const profile = profilesById.get(friendUserId) || {
        userId: friendUserId,
        name: DEFAULT_USER_NAME,
        email: '',
        avatarUrl: ''
      };

      return {
        friendshipId: row.id,
        createdAt: row.created_at || new Date().toISOString(),
        ...profile
      } satisfies FriendRecord;
    })
    .sort((left, right) => left.name.localeCompare(right.name) || left.email.localeCompare(right.email));
}

export async function searchDirectoryProfiles(
  client: SupabaseClient,
  query: string,
  currentUserId: string,
  currentFriendIds: string[]
): Promise<FriendSearchResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [] satisfies FriendSearchResult[];

  const wildcard = `%${trimmedQuery}%`;
  const [nameResult, emailResult] = await Promise.all([
    client.from(PROFILES_TABLE).select('user_id, display_name, email, avatar_url').ilike('display_name', wildcard).limit(12),
    client.from(PROFILES_TABLE).select('user_id, display_name, email, avatar_url').ilike('email', wildcard).limit(12)
  ]);

  if (nameResult.error) throw nameResult.error;
  if (emailResult.error) throw emailResult.error;

  const resultsById = new Map<string, DirectoryProfile>();
  for (const row of [...(nameResult.data || []), ...(emailResult.data || [])]) {
    const profile = mapDirectoryProfileFromRow(row as ProfileRow);
    resultsById.set(profile.userId, profile);
  }

  const friendIdSet = new Set(currentFriendIds);
  const normalizedQuery = trimmedQuery.toLowerCase();

  return [...resultsById.values()]
    .map((profile) => ({
      ...profile,
      isAlreadyFriend: friendIdSet.has(profile.userId),
      isCurrentUser: profile.userId === currentUserId
    }))
    .sort((left, right) => {
      const leftScore = getProfileScore(left, normalizedQuery) - (left.isCurrentUser ? 10 : 0) - (left.isAlreadyFriend ? 2 : 0);
      const rightScore = getProfileScore(right, normalizedQuery) - (right.isCurrentUser ? 10 : 0) - (right.isAlreadyFriend ? 2 : 0);
      return rightScore - leftScore || left.name.localeCompare(right.name) || left.email.localeCompare(right.email);
    });
}

export async function addFriend(client: SupabaseClient, currentUserId: string, friendUserId: string): Promise<void> {
  if (currentUserId === friendUserId) {
    throw new Error('You cannot add yourself as a friend.');
  }

  const pair = getFriendPair(currentUserId, friendUserId);
  const { error } = await client.from(FRIENDSHIPS_TABLE).upsert({
    user_low_id: pair.userLowId,
    user_high_id: pair.userHighId
  }, {
    onConflict: 'user_low_id,user_high_id'
  });

  if (error) throw error;
}

export async function removeFriendships(client: SupabaseClient, friendshipIds: string[]): Promise<void> {
  if (!friendshipIds.length) return;

  const { error } = await client.from(FRIENDSHIPS_TABLE).delete().in('id', friendshipIds);
  if (error) throw error;
}
