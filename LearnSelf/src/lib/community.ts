import type { SupabaseClient } from '@supabase/supabase-js';
import { COMMUNITY_COMMENTS_TABLE, COMMUNITY_POSTS_TABLE, DEFAULT_USER_NAME } from '../constants';
import type { CommunityComment, CommunityPost, CommunityPostFormValues, CommunityPostStatus, UserProfile } from '../types';

interface CommunityPostRow {
  id: string;
  user_id: string;
  author_name: string | null;
  author_email: string | null;
  title: string | null;
  body: string | null;
  status: CommunityPostStatus | null;
  created_at: string | null;
  withdrawn_at: string | null;
}

interface CommunityCommentRow {
  id: string;
  post_id: string;
  user_id: string;
  author_name: string | null;
  author_email: string | null;
  body: string | null;
  created_at: string | null;
}

function getDisplayName(profile: UserProfile) {
  return profile.name.trim() || profile.email.split('@')[0] || DEFAULT_USER_NAME;
}

export function mapCommunityPostFromRow(row: CommunityPostRow): CommunityPost {
  return {
    id: row.id,
    userId: row.user_id,
    authorName: row.author_name || DEFAULT_USER_NAME,
    authorEmail: row.author_email || '',
    title: row.title || '',
    body: row.body || '',
    status: row.status || 'open',
    createdAt: row.created_at || new Date().toISOString(),
    withdrawnAt: row.withdrawn_at || '',
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
    body: row.body || '',
    createdAt: row.created_at || new Date().toISOString()
  };
}

export async function fetchCommunityPosts(client: SupabaseClient) {
  const { data: postRows, error: postError } = await client
    .from(COMMUNITY_POSTS_TABLE)
    .select('id, user_id, author_name, author_email, title, body, status, created_at, withdrawn_at')
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  if (postError) throw postError;

  const posts = (postRows || []).map((row) => mapCommunityPostFromRow(row as CommunityPostRow));
  if (!posts.length) return posts;

  const postIds = posts.map((post) => post.id);
  const { data: commentRows, error: commentError } = await client
    .from(COMMUNITY_COMMENTS_TABLE)
    .select('id, post_id, user_id, author_name, author_email, body, created_at')
    .in('post_id', postIds)
    .order('created_at', { ascending: true });

  if (commentError) throw commentError;

  const commentsByPost = new Map<string, CommunityComment[]>();
  for (const row of commentRows || []) {
    const comment = mapCommunityCommentFromRow(row as CommunityCommentRow);
    const existing = commentsByPost.get(comment.postId) || [];
    existing.push(comment);
    commentsByPost.set(comment.postId, existing);
  }

  return posts.map((post) => ({
    ...post,
    comments: commentsByPost.get(post.id) || []
  }));
}

export async function insertCommunityPost(
  client: SupabaseClient,
  values: CommunityPostFormValues,
  currentUser: UserProfile
) {
  const { data, error } = await client
    .from(COMMUNITY_POSTS_TABLE)
    .insert({
      user_id: currentUser.id,
      author_name: getDisplayName(currentUser),
      author_email: currentUser.email.trim(),
      title: values.title.trim(),
      body: values.body.trim(),
      status: 'open'
    })
    .select('id, user_id, author_name, author_email, title, body, status, created_at, withdrawn_at')
    .single();

  if (error) throw error;
  return mapCommunityPostFromRow(data as CommunityPostRow);
}

export async function insertCommunityComment(
  client: SupabaseClient,
  postId: string,
  body: string,
  currentUser: UserProfile
) {
  const { data, error } = await client
    .from(COMMUNITY_COMMENTS_TABLE)
    .insert({
      post_id: postId,
      user_id: currentUser.id,
      author_name: getDisplayName(currentUser),
      author_email: currentUser.email.trim(),
      body: body.trim()
    })
    .select('id, post_id, user_id, author_name, author_email, body, created_at')
    .single();

  if (error) throw error;
  return mapCommunityCommentFromRow(data as CommunityCommentRow);
}

export async function withdrawCommunityPost(client: SupabaseClient, postId: string, userId: string) {
  const { data, error } = await client
    .from(COMMUNITY_POSTS_TABLE)
    .update({
      status: 'withdrawn',
      withdrawn_at: new Date().toISOString()
    })
    .eq('id', postId)
    .eq('user_id', userId)
    .eq('status', 'open')
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error('This request can no longer be withdrawn here. Please contact the admin for help.');
  }
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

export function getWithdrawWindowRemaining(createdAt: string, now = new Date()) {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return 0;
  return Math.max(0, created.getTime() + 86_400_000 - now.getTime());
}

export function canWithdrawCommunityPost(post: Pick<CommunityPost, 'createdAt'>, now = new Date()) {
  return getWithdrawWindowRemaining(post.createdAt, now) > 0;
}

export function formatWithdrawWindow(copyMs: number) {
  const totalMinutes = Math.max(1, Math.ceil(copyMs / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
}

export function getWithdrawHelpText(post: Pick<CommunityPost, 'createdAt'>, now = new Date()) {
  const remaining = getWithdrawWindowRemaining(post.createdAt, now);
  if (remaining > 0) {
    return `You can withdraw this request for ${formatWithdrawWindow(remaining)}.`;
  }

  return 'The 24-hour self-withdraw window has ended. Contact the admin if this request needs to be handled.';
}
