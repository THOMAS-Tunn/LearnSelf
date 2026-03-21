import type { SupabaseClient } from '@supabase/supabase-js';
import {
  COMMUNITY_COMMENT_LIKES_TABLE,
  COMMUNITY_COMMENT_PREFERENCES_TABLE,
  COMMUNITY_COMMENTS_TABLE,
  COMMUNITY_POST_LIKES_TABLE,
  COMMUNITY_POST_PREFERENCES_TABLE,
  COMMUNITY_POSTS_TABLE,
  DEFAULT_USER_NAME
} from '../constants';
import type { CommunityComment, CommunityPost, CommunityPostFormValues, CommunityPostStatus, UserProfile } from '../types';

interface CommunityPostRow {
  id: string;
  user_id: string;
  author_name: string | null;
  author_email: string | null;
  author_avatar_url: string | null;
  title: string | null;
  body: string | null;
  status: CommunityPostStatus | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
}

interface CommunityCommentRow {
  id: string;
  post_id: string;
  user_id: string;
  author_name: string | null;
  author_email: string | null;
  author_avatar_url: string | null;
  body: string | null;
  created_at: string | null;
}

interface CommunityPostPreferenceRow {
  post_id: string;
  is_hidden: boolean | null;
  is_pinned: boolean | null;
  is_favorite: boolean | null;
}

interface CommunityCommentPreferenceRow {
  comment_id: string;
  is_favorite: boolean | null;
}

interface CommunityPostLikeRow {
  post_id: string;
  user_id: string;
}

interface CommunityCommentLikeRow {
  comment_id: string;
  user_id: string;
}

function getDisplayName(profile: UserProfile) {
  return profile.name.trim() || profile.email.split('@')[0] || DEFAULT_USER_NAME;
}

function countLikes<T extends { user_id: string }>(rows: T[], getId: (row: T) => string, currentUserId: string) {
  const counts = new Map<string, number>();
  const likedIds = new Set<string>();

  for (const row of rows) {
    const id = getId(row);
    counts.set(id, (counts.get(id) || 0) + 1);
    if (row.user_id === currentUserId) {
      likedIds.add(id);
    }
  }

  return { counts, likedIds };
}

function buildPostPreferenceMap(rows: CommunityPostPreferenceRow[]) {
  const preferences = new Map<string, CommunityPostPreferenceRow>();
  for (const row of rows) {
    preferences.set(row.post_id, row);
  }
  return preferences;
}

function buildCommentPreferenceMap(rows: CommunityCommentPreferenceRow[]) {
  const preferences = new Map<string, CommunityCommentPreferenceRow>();
  for (const row of rows) {
    preferences.set(row.comment_id, row);
  }
  return preferences;
}

export function mapCommunityPostFromRow(row: CommunityPostRow): CommunityPost {
  return {
    id: row.id,
    userId: row.user_id,
    authorName: row.author_name || DEFAULT_USER_NAME,
    authorEmail: row.author_email || '',
    authorAvatarUrl: row.author_avatar_url || '',
    title: row.title || '',
    body: row.body || '',
    status: row.status || 'open',
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
    deletedAt: row.deleted_at || '',
    likesCount: 0,
    likedByCurrentUser: false,
    favoritedByCurrentUser: false,
    pinnedByCurrentUser: false,
    hiddenByCurrentUser: false,
    comments: []
  };
}

export function mapCommunityCommentFromRow(row: CommunityCommentRow): CommunityComment {
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    authorName: row.author_name || DEFAULT_USER_NAME,
    authorEmail: row.author_email || '',
    authorAvatarUrl: row.author_avatar_url || '',
    body: row.body || '',
    createdAt: row.created_at || new Date().toISOString(),
    likesCount: 0,
    likedByCurrentUser: false,
    favoritedByCurrentUser: false
  };
}

export async function fetchCommunityPosts(client: SupabaseClient, currentUserId: string): Promise<CommunityPost[]> {
  const { data: postRows, error: postError } = await client
    .from(COMMUNITY_POSTS_TABLE)
    .select('id, user_id, author_name, author_email, author_avatar_url, title, body, status, created_at, updated_at, deleted_at')
    .order('created_at', { ascending: false });

  if (postError) throw postError;

  const posts = (postRows || []).map((row) => mapCommunityPostFromRow(row as CommunityPostRow));
  if (!posts.length) return posts;

  const postIds = posts.map((post) => post.id);
  const { data: commentRows, error: commentError } = await client
    .from(COMMUNITY_COMMENTS_TABLE)
    .select('id, post_id, user_id, author_name, author_email, author_avatar_url, body, created_at')
    .in('post_id', postIds)
    .order('created_at', { ascending: true });

  if (commentError) throw commentError;

  const comments = (commentRows || []).map((row) => mapCommunityCommentFromRow(row as CommunityCommentRow));
  const commentIds = comments.map((comment) => comment.id);

  const [
    postPreferenceResult,
    commentPreferenceResult,
    postLikeResult,
    commentLikeResult
  ] = await Promise.all([
    client
      .from(COMMUNITY_POST_PREFERENCES_TABLE)
      .select('post_id, is_hidden, is_pinned, is_favorite')
      .eq('user_id', currentUserId)
      .in('post_id', postIds),
    commentIds.length
      ? client
        .from(COMMUNITY_COMMENT_PREFERENCES_TABLE)
        .select('comment_id, is_favorite')
        .eq('user_id', currentUserId)
        .in('comment_id', commentIds)
      : Promise.resolve({ data: [] as CommunityCommentPreferenceRow[], error: null }),
    client
      .from(COMMUNITY_POST_LIKES_TABLE)
      .select('post_id, user_id')
      .in('post_id', postIds),
    commentIds.length
      ? client
        .from(COMMUNITY_COMMENT_LIKES_TABLE)
        .select('comment_id, user_id')
        .in('comment_id', commentIds)
      : Promise.resolve({ data: [] as CommunityCommentLikeRow[], error: null })
  ]);

  if (postPreferenceResult.error) throw postPreferenceResult.error;
  if (commentPreferenceResult.error) throw commentPreferenceResult.error;
  if (postLikeResult.error) throw postLikeResult.error;
  if (commentLikeResult.error) throw commentLikeResult.error;

  const postPreferences = buildPostPreferenceMap((postPreferenceResult.data || []) as CommunityPostPreferenceRow[]);
  const commentPreferences = buildCommentPreferenceMap((commentPreferenceResult.data || []) as CommunityCommentPreferenceRow[]);
  const postLikes = countLikes((postLikeResult.data || []) as CommunityPostLikeRow[], (row) => row.post_id, currentUserId);
  const commentLikes = countLikes((commentLikeResult.data || []) as CommunityCommentLikeRow[], (row) => row.comment_id, currentUserId);

  const commentsByPost = new Map<string, CommunityComment[]>();
  for (const comment of comments) {
    const existing = commentsByPost.get(comment.postId) || [];
    const preferences = commentPreferences.get(comment.id);

    existing.push({
      ...comment,
      likesCount: commentLikes.counts.get(comment.id) || 0,
      likedByCurrentUser: commentLikes.likedIds.has(comment.id),
      favoritedByCurrentUser: Boolean(preferences?.is_favorite)
    });
    commentsByPost.set(comment.postId, existing);
  }

  return posts.map((post) => {
    const preferences = postPreferences.get(post.id);

    return {
      ...post,
      likesCount: postLikes.counts.get(post.id) || 0,
      likedByCurrentUser: postLikes.likedIds.has(post.id),
      favoritedByCurrentUser: Boolean(preferences?.is_favorite),
      pinnedByCurrentUser: Boolean(preferences?.is_pinned),
      hiddenByCurrentUser: Boolean(preferences?.is_hidden),
      comments: commentsByPost.get(post.id) || []
    };
  });
}

export async function insertCommunityPost(
  client: SupabaseClient,
  values: CommunityPostFormValues,
  currentUser: UserProfile
): Promise<CommunityPost> {
  const { data, error } = await client
    .from(COMMUNITY_POSTS_TABLE)
    .insert({
      user_id: currentUser.id,
      author_name: getDisplayName(currentUser),
      author_email: currentUser.email.trim(),
      author_avatar_url: currentUser.avatarUrl.trim() || null,
      title: values.title.trim(),
      body: values.body.trim(),
      status: 'open'
    })
    .select('id, user_id, author_name, author_email, author_avatar_url, title, body, status, created_at, updated_at, deleted_at')
    .single();

  if (error) throw error;
  return mapCommunityPostFromRow(data as CommunityPostRow);
}

export async function insertCommunityComment(
  client: SupabaseClient,
  postId: string,
  body: string,
  currentUser: UserProfile
): Promise<CommunityComment> {
  const { data, error } = await client
    .from(COMMUNITY_COMMENTS_TABLE)
    .insert({
      post_id: postId,
      user_id: currentUser.id,
      author_name: getDisplayName(currentUser),
      author_email: currentUser.email.trim(),
      author_avatar_url: currentUser.avatarUrl.trim() || null,
      body: body.trim()
    })
    .select('id, post_id, user_id, author_name, author_email, author_avatar_url, body, created_at')
    .single();

  if (error) throw error;
  return mapCommunityCommentFromRow(data as CommunityCommentRow);
}

export async function deleteCommunityPost(client: SupabaseClient, postId: string, userId: string): Promise<void> {
  const { data, error } = await client
    .from(COMMUNITY_POSTS_TABLE)
    .update({
      status: 'deleted',
      deleted_at: new Date().toISOString()
    })
    .eq('id', postId)
    .eq('user_id', userId)
    .eq('status', 'open')
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error('This post can no longer be deleted here.');
  }
}

async function upsertCommunityPostPreference(
  client: SupabaseClient,
  postId: string,
  userId: string,
  field: 'is_hidden' | 'is_pinned' | 'is_favorite',
  value: boolean
): Promise<void> {
  const { error } = await client.from(COMMUNITY_POST_PREFERENCES_TABLE).upsert({
    user_id: userId,
    post_id: postId,
    [field]: value
  }, {
    onConflict: 'user_id,post_id'
  });

  if (error) throw error;
}

export async function setCommunityPostHidden(client: SupabaseClient, postId: string, userId: string, hidden: boolean): Promise<void> {
  await upsertCommunityPostPreference(client, postId, userId, 'is_hidden', hidden);
}

export async function setCommunityPostPinned(client: SupabaseClient, postId: string, userId: string, pinned: boolean): Promise<void> {
  await upsertCommunityPostPreference(client, postId, userId, 'is_pinned', pinned);
}

export async function setCommunityPostFavorite(client: SupabaseClient, postId: string, userId: string, favorite: boolean): Promise<void> {
  await upsertCommunityPostPreference(client, postId, userId, 'is_favorite', favorite);
}

export async function setCommunityCommentFavorite(client: SupabaseClient, commentId: string, userId: string, favorite: boolean): Promise<void> {
  const { error } = await client.from(COMMUNITY_COMMENT_PREFERENCES_TABLE).upsert({
    user_id: userId,
    comment_id: commentId,
    is_favorite: favorite
  }, {
    onConflict: 'user_id,comment_id'
  });

  if (error) throw error;
}

export async function setCommunityPostLike(client: SupabaseClient, postId: string, userId: string, liked: boolean): Promise<void> {
  const response = liked
    ? await client.from(COMMUNITY_POST_LIKES_TABLE).upsert({
      user_id: userId,
      post_id: postId
    }, {
      onConflict: 'user_id,post_id'
    })
    : await client.from(COMMUNITY_POST_LIKES_TABLE).delete().eq('user_id', userId).eq('post_id', postId);

  if (response.error) throw response.error;
}

export async function setCommunityCommentLike(client: SupabaseClient, commentId: string, userId: string, liked: boolean): Promise<void> {
  const response = liked
    ? await client.from(COMMUNITY_COMMENT_LIKES_TABLE).upsert({
      user_id: userId,
      comment_id: commentId
    }, {
      onConflict: 'user_id,comment_id'
    })
    : await client.from(COMMUNITY_COMMENT_LIKES_TABLE).delete().eq('user_id', userId).eq('comment_id', commentId);

  if (response.error) throw response.error;
}

export function getCommunityRelativeTime(iso: string, now = new Date()) {
  const date = new Date(iso);
  const diff = now.getTime() - date.getTime();
  const pluralize = (count: number, singular: string, plural: string) => `${count} ${count === 1 ? singular : plural}`;

  if (Number.isNaN(date.getTime())) return iso;
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${pluralize(Math.max(1, Math.floor(diff / 60_000)), 'min', 'mins')} ago`;
  if (diff < 86_400_000) return `${pluralize(Math.max(1, Math.floor(diff / 3_600_000)), 'hr', 'hrs')} ago`;
  if (diff < 604_800_000) return `${pluralize(Math.max(1, Math.floor(diff / 86_400_000)), 'day', 'days')} ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getDeleteWindowRemaining(createdAt: string, now = new Date()) {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return 0;
  return Math.max(0, created.getTime() + 86_400_000 - now.getTime());
}

export function canDeleteCommunityPost(post: Pick<CommunityPost, 'createdAt'>, now = new Date()) {
  return getDeleteWindowRemaining(post.createdAt, now) > 0;
}

export function formatDeleteWindow(copyMs: number) {
  const totalMinutes = Math.max(1, Math.ceil(copyMs / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
}

export function getDeleteHelpText(post: Pick<CommunityPost, 'createdAt' | 'status'>, now = new Date()) {
  if (post.status === 'deleted') {
    return 'This post has already been deleted. Only you can still see it here.';
  }

  const remaining = getDeleteWindowRemaining(post.createdAt, now);
  if (remaining > 0) {
    return `You can delete this post for ${formatDeleteWindow(remaining)}.`;
  }

  return 'The 24-hour self-delete window has ended for this post.';
}
