import type { SupabaseClient } from '@supabase/supabase-js';
import {
  CLASS_ASSIGNMENTS_TABLE,
  CLASSES_TABLE,
  CLASS_MEMBERSHIPS_TABLE,
  SUPABASE_TABLE,
  TEACHER_VERIFICATION_REQUESTS_TABLE
} from '../constants';
import { getDueTimeOrDefault } from './assignment';
import type { ClassAssignmentTemplate, ClassRoom, Difficulty, TeacherVerificationStatus, UserProfile } from '../types';

interface ClassRow {
  id: string;
  teacher_id: string;
  name: string;
  code: string;
  description: string | null;
}

interface ClassAssignmentRow {
  id: string;
  teacher_id: string;
  class_id: string;
  name: string;
  description: string | null;
  due_date: string;
  due_time: string | null;
  difficulty: Difficulty;
  created_at: string;
  classes?: { name: string }[] | { name: string } | null;
}

function mapTeacherStatus(profile: { role?: string | null; teacher_verification_status?: TeacherVerificationStatus | null }): Pick<UserProfile, 'isTeacher' | 'teacherVerificationStatus'> {
  const teacherVerificationStatus = profile.teacher_verification_status || 'none';
  const isTeacher = profile.role === 'teacher' || teacherVerificationStatus === 'approved';
  return { isTeacher, teacherVerificationStatus };
}

export async function fetchTeacherStatus(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from('profiles')
    .select('role, teacher_verification_status')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return mapTeacherStatus(data || {});
}

export async function requestTeacherVerification(
  client: SupabaseClient,
  user: UserProfile,
  adminEmail: string
): Promise<{ mailtoUrl: string }> {
  const trimmedAdminEmail = adminEmail.trim();
  if (!trimmedAdminEmail.includes('@')) {
    throw new Error('Missing admin verification email. Set LEARNSELF_TEACHER_APPROVER_EMAIL in window config.');
  }

  const subject = encodeURIComponent(`[LearnSelf] Teacher verification request: ${user.name}`);
  const body = encodeURIComponent(
    [
      'Please review this teacher verification request.',
      '',
      `Name: ${user.name}`,
      `Email: ${user.email}`,
      `User ID: ${user.id}`,
      `Requested at: ${new Date().toISOString()}`,
      '',
      'Approve by running SQL: select public.approve_teacher_verification_for_user(\'' + user.id + '\');'
    ].join('\n')
  );

  const { error } = await client.from(TEACHER_VERIFICATION_REQUESTS_TABLE).insert({
    requester_user_id: user.id,
    requester_name: user.name,
    requester_email: user.email,
    admin_email: trimmedAdminEmail,
    status: 'pending'
  });

  if (error) throw error;

  const { error: profileError } = await client
    .from('profiles')
    .update({
      role: 'teacher_pending',
      teacher_verification_status: 'pending'
    })
    .eq('user_id', user.id);

  if (profileError) throw profileError;

  return {
    mailtoUrl: `mailto:${trimmedAdminEmail}?subject=${subject}&body=${body}`
  };
}

export async function fetchTeacherClasses(client: SupabaseClient, teacherId: string): Promise<ClassRoom[]> {
  const [{ data: classesData, error: classError }, { data: membershipData, error: membershipError }] = await Promise.all([
    client.from(CLASSES_TABLE).select('id, teacher_id, name, code, description').eq('teacher_id', teacherId).order('name', { ascending: true }),
    client.from(CLASS_MEMBERSHIPS_TABLE).select('class_id').eq('status', 'active')
  ]);

  if (classError) throw classError;
  if (membershipError) throw membershipError;

  const countByClassId = new Map<string, number>();
  for (const row of membershipData || []) {
    const classId = (row as { class_id: string }).class_id;
    countByClassId.set(classId, (countByClassId.get(classId) || 0) + 1);
  }

  return ((classesData || []) as ClassRow[]).map((row) => ({
    id: row.id,
    teacherId: row.teacher_id,
    name: row.name,
    code: row.code,
    description: row.description || '',
    studentCount: countByClassId.get(row.id) || 0
  }));
}

export async function createTeacherClass(
  client: SupabaseClient,
  teacherId: string,
  values: { name: string; code: string; description: string }
): Promise<void> {
  const { error } = await client.from(CLASSES_TABLE).insert({
    teacher_id: teacherId,
    name: values.name,
    code: values.code.toUpperCase(),
    description: values.description || null
  });
  if (error) throw error;
}

export async function fetchTeacherClassAssignments(client: SupabaseClient, teacherId: string): Promise<ClassAssignmentTemplate[]> {
  const { data, error } = await client
    .from(CLASS_ASSIGNMENTS_TABLE)
    .select('id, teacher_id, class_id, name, description, due_date, due_time, difficulty, created_at, classes(name)')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return ((data || []) as ClassAssignmentRow[]).map((row) => ({
    id: row.id,
    teacherId: row.teacher_id,
    classId: row.class_id,
    className: Array.isArray(row.classes) ? (row.classes[0]?.name || 'Class') : (row.classes?.name || 'Class'),
    name: row.name,
    description: row.description || '',
    due: row.due_date,
    dueTime: (row.due_time || '00:00').slice(0, 5),
    difficulty: row.difficulty,
    assignedStudentsCount: 0,
    createdAt: row.created_at
  }));
}

export async function assignClassAssignmentToStudents(
  client: SupabaseClient,
  teacherId: string,
  payload: {
    classId: string;
    name: string;
    description: string;
    dueDate: string;
    dueTime: string;
    difficulty: Difficulty;
  }
): Promise<void> {
  const { data: classInfo, error: classError } = await client
    .from(CLASSES_TABLE)
    .select('id, teacher_id, name')
    .eq('id', payload.classId)
    .maybeSingle();

  if (classError) throw classError;
  if (!classInfo || classInfo.teacher_id !== teacherId) {
    throw new Error('You can only assign work to your own classes.');
  }

  const { error: templateError } = await client.from(CLASS_ASSIGNMENTS_TABLE).insert({
    teacher_id: teacherId,
    class_id: payload.classId,
    name: payload.name,
    description: payload.description || null,
    due_date: payload.dueDate,
    due_time: getDueTimeOrDefault(payload.dueTime),
    difficulty: payload.difficulty
  });
  if (templateError) throw templateError;

  const { data: members, error: memberError } = await client
    .from(CLASS_MEMBERSHIPS_TABLE)
    .select('student_id')
    .eq('class_id', payload.classId)
    .eq('status', 'active');

  if (memberError) throw memberError;

  const studentIds = (members || []).map((row) => (row as { student_id: string }).student_id);
  if (!studentIds.length) {
    return;
  }

  const rows = studentIds.map((studentId) => ({
    user_id: studentId,
    name: payload.name,
    class_name: classInfo.name,
    assigned_date: new Date().toISOString().slice(0, 10),
    due_date: payload.dueDate,
    due_time: getDueTimeOrDefault(payload.dueTime),
    description: payload.description || '',
    difficulty: payload.difficulty,
    status: 'active'
  }));

  const { error: assignmentError } = await client.from(SUPABASE_TABLE).insert(rows);
  if (assignmentError) throw assignmentError;
}
