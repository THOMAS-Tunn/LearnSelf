import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { DEFAULT_USER_NAME, SUPABASE_TABLE } from '../constants';
import type { Assignment, AssignmentStatus, Difficulty, UserProfile } from '../types';

interface LearnSelfConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  siteUrl: string;
}

interface AssignmentRow {
  id: string;
  user_id: string;
  name: string | null;
  class_name: string | null;
  assigned_date: string | null;
  due_date: string | null;
  description: string | null;
  difficulty: Difficulty | null;
  status: AssignmentStatus | null;
  created_at?: string | null;
}

export function getSupabaseConfig(): LearnSelfConfig {
  const fromWindow = window.LEARNSELF_CONFIG || {};
  const fromMeta = (name: string) => document.querySelector(`meta[name="${name}"]`)?.getAttribute('content')?.trim() || '';
  const fromGlobal = (name: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY') => {
    const value = import.meta.env[name];
    return typeof value === 'string' ? value.trim() : '';
  };

  return {
    supabaseUrl: fromWindow.supabaseUrl || fromGlobal('VITE_SUPABASE_URL') || fromMeta('learnself-supabase-url'),
    supabaseAnonKey: fromWindow.supabaseAnonKey || fromGlobal('VITE_SUPABASE_ANON_KEY') || fromMeta('learnself-supabase-anon-key'),
    siteUrl: fromWindow.siteUrl || fromMeta('learnself-site-url') || window.location.origin
  };
}

export function createSupabaseBrowserClient() {
  const config = getSupabaseConfig();
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    return { client: null, config };
  }

  return {
    client: createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }),
    config
  };
}

export function mapUser(user: User): UserProfile {
  return {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.full_name?.trim() || user.email?.split('@')[0] || DEFAULT_USER_NAME
  };
}

export function mapAssignmentFromRow(row: AssignmentRow): Assignment {
  return {
    id: row.id,
    name: row.name || '',
    cls: row.class_name || '',
    difficulty: row.difficulty || 'Easy',
    ad: row.assigned_date || '',
    due: row.due_date || '',
    desc: row.description || '',
    status: row.status || 'active'
  };
}

export function buildAssignmentPayload(assignment: Assignment, userId: string) {
  return {
    user_id: userId,
    name: assignment.name,
    class_name: assignment.cls,
    assigned_date: assignment.ad || null,
    due_date: assignment.due || null,
    description: assignment.desc || '',
    difficulty: assignment.difficulty,
    status: assignment.status
  };
}

export async function fetchAssignments(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from(SUPABASE_TABLE)
    .select('id, user_id, name, class_name, assigned_date, due_date, description, difficulty, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map(mapAssignmentFromRow);
}

export async function insertAssignment(client: SupabaseClient, assignment: Assignment, userId: string) {
  const { data, error } = await client
    .from(SUPABASE_TABLE)
    .insert(buildAssignmentPayload(assignment, userId))
    .select('id, user_id, name, class_name, assigned_date, due_date, description, difficulty, status, created_at')
    .single();

  if (error) throw error;
  return mapAssignmentFromRow(data as AssignmentRow);
}

export async function updateAssignmentStatuses(
  client: SupabaseClient,
  userId: string,
  ids: string[],
  status: AssignmentStatus
) {
  const { error } = await client.from(SUPABASE_TABLE).update({ status }).eq('user_id', userId).in('id', ids);
  if (error) throw error;
}
