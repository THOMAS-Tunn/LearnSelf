import { createClient, type Session, type SupabaseClient, type User } from '@supabase/supabase-js';
import {
  ASSIGNMENT_REPEAT_RULES_TABLE,
  DEFAULT_USER_NAME,
  SUPABASE_STORAGE_KEY,
  SUPABASE_TABLE
} from '../constants';
import type {
  Assignment,
  AssignmentRepeatEvery,
  AssignmentRepeatRulePayload,
  AssignmentStatus,
  Difficulty,
  UserProfile
} from '../types';

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
  repeat_enabled?: boolean | null;
  repeat_every?: AssignmentRepeatEvery | null;
  repeat_time?: string | null;
  repeat_days_of_week?: number[] | null;
  repeat_days_of_month?: number[] | null;
  repeat_timezone?: string | null;
  repeat_rule_id?: string | null;
  created_at?: string | null;
}

interface AssignmentRepeatRuleRow {
  id: string;
}

let cachedClient: SupabaseClient | null = null;
let cachedClientKey = '';
let initialSessionPromise: Promise<Session | null> | null = null;

function getClientCacheKey(config: LearnSelfConfig) {
  return `${config.supabaseUrl}::${config.supabaseAnonKey}`;
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

  const clientKey = getClientCacheKey(config);
  if (!cachedClient || cachedClientKey !== clientKey) {
    cachedClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: SUPABASE_STORAGE_KEY
      }
    });
    cachedClientKey = clientKey;
    initialSessionPromise = null;
  }

  return {
    client: cachedClient,
    config
  };
}

export async function getInitialBrowserSession(client: SupabaseClient) {
  if (!initialSessionPromise) {
    initialSessionPromise = client.auth.getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        return data.session ?? null;
      })
      .finally(() => {
        initialSessionPromise = null;
      });
  }

  return initialSessionPromise;
}

export function mapUser(user: User): UserProfile {
  return {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.full_name?.trim() || user.email?.split('@')[0] || DEFAULT_USER_NAME,
    avatarUrl: typeof user.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url.trim() : ''
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
    status: row.status || 'active',
    repeatEnabled: Boolean(row.repeat_enabled),
    repeatEvery: row.repeat_every || '',
    repeatTime: row.repeat_time ? row.repeat_time.slice(0, 5) : '',
    repeatDaysOfWeek: row.repeat_days_of_week || [],
    repeatDaysOfMonth: row.repeat_days_of_month || [],
    repeatTimezone: row.repeat_timezone || '',
    repeatRuleId: row.repeat_rule_id || ''
  };
}

export function buildAssignmentPayload(assignment: Assignment, userId: string) {
  const payload: Record<string, unknown> = {
    user_id: userId,
    name: assignment.name,
    class_name: assignment.cls,
    assigned_date: assignment.ad || null,
    due_date: assignment.due || null,
    description: assignment.desc || '',
    difficulty: assignment.difficulty,
    status: assignment.status
  };

  if (
    assignment.repeatEnabled
    || assignment.repeatRuleId
    || assignment.repeatEvery
    || assignment.repeatTime
    || assignment.repeatTimezone
  ) {
    payload.repeat_enabled = assignment.repeatEnabled;
    payload.repeat_every = assignment.repeatEvery || null;
    payload.repeat_time = assignment.repeatTime || null;
    payload.repeat_days_of_week = assignment.repeatDaysOfWeek;
    payload.repeat_days_of_month = assignment.repeatDaysOfMonth;
    payload.repeat_timezone = assignment.repeatTimezone || null;
    payload.repeat_rule_id = assignment.repeatRuleId || null;
  }

  return payload;
}

export function buildAssignmentRepeatRulePayload(rule: AssignmentRepeatRulePayload, userId: string) {
  return {
    user_id: userId,
    name: rule.name,
    class_name: rule.cls,
    difficulty: rule.difficulty,
    description: rule.desc || '',
    repeat_every: rule.repeatEvery,
    repeat_time: rule.repeatTime,
    repeat_days_of_week: rule.repeatDaysOfWeek,
    repeat_days_of_month: rule.repeatDaysOfMonth,
    repeat_timezone: rule.repeatTimezone,
    anchor_date: rule.anchorDate,
    uses_assigned_date: rule.usesAssignedDate,
    due_offset_days: rule.dueOffsetDays,
    next_occurrence_on: rule.nextOccurrenceOn
  };
}

export async function fetchAssignments(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from(SUPABASE_TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map(mapAssignmentFromRow);
}

export async function insertAssignment(client: SupabaseClient, assignment: Assignment, userId: string) {
  const { data, error } = await client
    .from(SUPABASE_TABLE)
    .insert(buildAssignmentPayload(assignment, userId))
    .select('*')
    .single();

  if (error) throw error;
  return mapAssignmentFromRow(data as AssignmentRow);
}

export async function insertAssignmentRepeatRule(
  client: SupabaseClient,
  rule: AssignmentRepeatRulePayload,
  userId: string
) {
  const { data, error } = await client
    .from(ASSIGNMENT_REPEAT_RULES_TABLE)
    .insert(buildAssignmentRepeatRulePayload(rule, userId))
    .select('id')
    .single();

  if (error) throw error;
  return (data as AssignmentRepeatRuleRow).id;
}

export async function deleteAssignmentRepeatRule(client: SupabaseClient, ruleId: string) {
  const { error } = await client.from(ASSIGNMENT_REPEAT_RULES_TABLE).delete().eq('id', ruleId);
  if (error) throw error;
}

export async function syncRecurringAssignments(client: SupabaseClient) {
  const { error } = await client.rpc('sync_recurring_assignments_for_current_user');
  if (!error) return;

  const message = error.message.toLowerCase();
  if (
    message.includes('does not exist')
    || message.includes('could not find the function')
    || message.includes('function public.sync_recurring_assignments_for_current_user() does not exist')
  ) {
    return;
  }

  throw error;
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

export async function deleteAssignments(client: SupabaseClient, userId: string, ids: string[]) {
  const { error } = await client.from(SUPABASE_TABLE).delete().eq('user_id', userId).in('id', ids);
  if (error) throw error;
}
