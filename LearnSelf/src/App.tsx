import { useEffect, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AppShell } from './components/layout/AppShell';
import { AuthPage } from './components/auth/AuthPage';
import { DashboardView } from './components/dashboard/DashboardView';
import { ForgotPasswordModal } from './components/modals/ForgotPasswordModal';
import { AddAssignmentModal } from './components/modals/AddAssignmentModal';
import { AssignmentDetailModal } from './components/modals/AssignmentDetailModal';
import { ResetPasswordModal } from './components/modals/ResetPasswordModal';
import { SimpleTableView } from './components/views/SimpleTableView';
import { ToolsView } from './components/views/ToolsView';
import { HelpView } from './components/views/HelpView';
import { ProfileView } from './components/views/ProfileView';
import { SettingsView } from './components/views/SettingsView';
import { getInitialUser, sortAssignments } from './lib/assignment';
import { createSupabaseBrowserClient, fetchAssignments, insertAssignment, mapUser, updateAssignmentStatuses, getSupabaseConfig } from './lib/supabase';
import type { Assignment, AssignmentFormValues, StatusMessage, UserProfile, ViewName } from './types';

const emptyAssignmentForm: AssignmentFormValues = {
  name: '',
  cls: '',
  difficulty: '',
  ad: '',
  due: '',
  desc: ''
};

function formatForgotPasswordError(error: unknown) {
  const message = getErrorMessage(error, 'Unable to send reset email.');
  const normalized = message.toLowerCase();

  if (normalized.includes('rate limit')) {
    return 'Too many reset requests were sent. Please wait a little and try again.';
  }

  if (normalized.includes('email not confirmed')) {
    return 'This email still needs to be confirmed before you can reset the password.';
  }

  return message;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}

export default function App() {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile>(getInitialUser());
  const [activeView, setActiveView] = useState<ViewName>('dashboard');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [finished, setFinished] = useState<Assignment[]>([]);
  const [trash, setTrash] = useState<Assignment[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [isSignup, setIsSignup] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState<string>();
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [resetPasswordStatus, setResetPasswordStatus] = useState<StatusMessage | null>(null);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [loginErrors, setLoginErrors] = useState<{ email?: string; password?: string }>({});
  const [signupErrors, setSignupErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [addForm, setAddForm] = useState<AssignmentFormValues>(emptyAssignmentForm);
  const [addFormErrors, setAddFormErrors] = useState<Partial<Record<keyof AssignmentFormValues, string>>>({});
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [loginStatus, setLoginStatus] = useState<StatusMessage | null>(null);
  const [signupStatus, setSignupStatus] = useState<StatusMessage | null>(null);
  const [forgotPasswordStatus, setForgotPasswordStatus] = useState<StatusMessage | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileConfirmPassword, setProfileConfirmPassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileStatus, setProfileStatus] = useState<StatusMessage | null>(null);

  const sortedAssignments = useMemo(() => sortAssignments(assignments), [assignments]);

  function isRecoverableSessionError(error: unknown) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    return [
      'jwt',
      'refresh token',
      'auth session missing',
      'invalid token',
      'session',
      'user from sub claim in jwt does not exist'
    ].some((fragment) => message.includes(fragment));
  }

  async function recoverBrokenSession(message = 'Your session expired or became out of sync. Please log in again.') {
    try {
      await client?.auth.signOut({ scope: 'local' });
    } catch {
      // Ignore sign-out cleanup failures and continue resetting local UI state.
    }

    resetAppState();
    setLoginStatus({ tone: 'info', text: message });
  }

  async function resolveValidSessionUser(activeClient: SupabaseClient, fallbackUserId?: string) {
    const { data, error } = await activeClient.auth.getUser();
    if (error) throw error;
    const user = data.user;
    if (!user && fallbackUserId) {
      throw new Error('Your account session no longer exists on the server.');
    }
    return user;
  }

  useEffect(() => {
    const { client: supabaseClient, config } = createSupabaseBrowserClient();
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      setLoginStatus({
        tone: 'info',
        text: 'Add your Supabase URL and anon key before logging in. The app is already wired for auth and assignment data.'
      });
      setSignupStatus({
        tone: 'info',
        text: 'Supabase is not configured yet. Add the values through Vite env vars or window.LEARNSELF_CONFIG.'
      });
      setIsCheckingSession(false);
      return;
    }

    if (!supabaseClient) {
      setLoginStatus({ tone: 'error', text: 'Supabase client could not be created.' });
      setIsCheckingSession(false);
      return;
    }

    setClient(supabaseClient);

    supabaseClient.auth.getSession().then(async ({ data, error }) => {
      if (error) {
        setLoginStatus({ tone: 'error', text: error.message || 'Unable to restore your session.' });
        setIsCheckingSession(false);
        return;
      }

      if (data.session?.user) {
        try {
          const validUser = await resolveValidSessionUser(supabaseClient, data.session.user.id);
          if (validUser) {
            await hydrateUserSession(supabaseClient, validUser.id, mapUser(validUser));
          } else {
            await recoverBrokenSession('Your previous session is no longer valid. Please log in again.');
          }
        } catch (sessionError) {
          if (isRecoverableSessionError(sessionError)) {
            await recoverBrokenSession();
          } else {
            const message = sessionError instanceof Error ? sessionError.message : 'Unable to validate your saved session.';
            setLoginStatus({ tone: 'error', text: message });
          }
        }
      }
      setIsCheckingSession(false);
    });

    const { data: authListener } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setResetPasswordOpen(true);
        setResetPasswordStatus({ tone: 'info', text: 'Recovery link accepted. Enter your new password below.' });
      }
      if (event === 'SIGNED_OUT') {
        resetAppState();
        return;
      }
      if (session?.user) {
        try {
          const validUser = await resolveValidSessionUser(supabaseClient, session.user.id);
          if (validUser) {
            await hydrateUserSession(supabaseClient, validUser.id, mapUser(validUser));
          } else {
            await recoverBrokenSession('This session is no longer available. Please log in again.');
          }
        } catch (sessionError) {
          if (isRecoverableSessionError(sessionError)) {
            await recoverBrokenSession();
            return;
          }

          const message = sessionError instanceof Error ? sessionError.message : 'Unable to refresh your account session.';
          setLoginStatus({ tone: 'error', text: message });
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function hydrateUserSession(activeClient: SupabaseClient, userId: string, profile: UserProfile) {
    setCurrentUser(profile);
    setProfileName(profile.name);
    setProfileEmail(profile.email);
    setProfilePassword('');
    setProfileConfirmPassword('');
    setProfileStatus(null);
    setLoginStatus(null);
    setSignupStatus(null);
    setLoginPassword('');
    setSignupPassword('');

    try {
      const allAssignments = await fetchAssignments(activeClient, userId);
      setAssignments(allAssignments.filter((item) => item.status === 'active'));
      setFinished(allAssignments.filter((item) => item.status === 'finished'));
      setTrash(allAssignments.filter((item) => item.status === 'trashed'));
      setActiveView('dashboard');
      setSelectedIds([]);
    } catch (error) {
      if (isRecoverableSessionError(error)) {
        await recoverBrokenSession();
        return;
      }

      const message = getErrorMessage(error, 'Unable to load assignments.');
      setLoginStatus({ tone: 'error', text: `Signed in, but loading assignments failed: ${message}` });
      setAssignments([]);
      setFinished([]);
      setTrash([]);
    }
  }

  function resetAppState() {
    setCurrentUser(getInitialUser());
    setAssignments([]);
    setFinished([]);
    setTrash([]);
    setSelectedIds([]);
    setSelectedAssignment(null);
    setActiveView('dashboard');
    setLoginPassword('');
    setLoginStatus(null);
    setSignupStatus(null);
    setForgotPasswordOpen(false);
    setForgotPasswordSuccess(false);
    setResetPasswordOpen(false);
    setResetPasswordValue('');
    setResetPasswordConfirm('');
    setResetPasswordStatus(null);
    setAddModalOpen(false);
    setAddLoading(false);
    setLogoutLoading(false);
    setProfileName('');
    setProfileEmail('');
    setProfilePassword('');
    setProfileConfirmPassword('');
    setProfileLoading(false);
    setProfileStatus(null);
  }

  function validateLogin() {
    const nextErrors: typeof loginErrors = {};
    if (!loginEmail.trim()) nextErrors.email = 'Please enter your email.';
    if (loginPassword.trim().length < 5) nextErrors.password = 'Password must be at least 5 characters.';
    setLoginErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateSignup() {
    const nextErrors: typeof signupErrors = {};
    if (!signupName.trim()) nextErrors.name = 'Please enter your name.';
    if (!signupEmail.includes('@')) nextErrors.email = 'Please enter a valid email.';
    if (signupPassword.trim().length < 5) nextErrors.password = 'Password must be at least 5 characters.';
    setSignupErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateAssignmentForm() {
    const nextErrors: typeof addFormErrors = {};
    if (!addForm.name.trim()) nextErrors.name = 'Name is required.';
    if (!addForm.difficulty) nextErrors.difficulty = 'Difficulty is required.';
    if (!addForm.due) nextErrors.due = 'Due date is required.';
    setAddFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleLogin() {
    if (!validateLogin() || !client) return;
    setLoginLoading(true);
    setLoginStatus(null);

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword.trim()
      });

      if (error) throw error;
      if (data.user) {
        await hydrateUserSession(client, data.user.id, mapUser(data.user));
      }
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to log in.');
      setLoginStatus({ tone: 'error', text: message });
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleSignup() {
    if (!validateSignup() || !client) return;
    setSignupLoading(true);
    setSignupStatus(null);

    try {
      const { siteUrl } = getSupabaseConfig();
      const { data, error } = await client.auth.signUp({
        email: signupEmail.trim(),
        password: signupPassword.trim(),
        options: {
          data: { full_name: signupName.trim() },
          emailRedirectTo: siteUrl
        }
      });

      if (error) throw error;

      if (data.session?.user) {
        await hydrateUserSession(client, data.session.user.id, mapUser(data.session.user));
      } else {
        setIsSignup(false);
        setLoginEmail(signupEmail.trim());
        setSignupPassword('');
        setLoginStatus({ tone: 'success', text: 'Account created. Check your email to confirm your account before logging in.' });
      }
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to create your account.');
      setSignupStatus({ tone: 'error', text: message });
    } finally {
      setSignupLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!forgotPasswordEmail.includes('@') || !client) {
      setForgotPasswordError('Please enter your email.');
      return;
    }

    setForgotPasswordLoading(true);
    setForgotPasswordError(undefined);
    setForgotPasswordStatus(null);

    try {
      const { siteUrl } = getSupabaseConfig();
      const { error } = await client.auth.resetPasswordForEmail(forgotPasswordEmail.trim(), { redirectTo: siteUrl });
      if (error) throw error;
      setForgotPasswordSuccess(true);
    } catch (error) {
      setForgotPasswordStatus({ tone: 'error', text: formatForgotPasswordError(error) });
    } finally {
      setForgotPasswordLoading(false);
    }
  }

  async function handleProfileSave() {
    if (!client) return;

    const trimmedName = profileName.trim();
    const trimmedEmail = profileEmail.trim();
    const nextPassword = profilePassword.trim();
    const updates: {
      email?: string;
      password?: string;
      data?: { full_name: string };
    } = {};

    if (!trimmedName) {
      setProfileStatus({ tone: 'error', text: 'Please enter your name.' });
      return;
    }

    if (!trimmedEmail.includes('@')) {
      setProfileStatus({ tone: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    if (nextPassword && nextPassword.length < 5) {
      setProfileStatus({ tone: 'error', text: 'New password must be at least 5 characters.' });
      return;
    }

    if (nextPassword !== profileConfirmPassword.trim()) {
      setProfileStatus({ tone: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    if (trimmedName !== currentUser.name) updates.data = { full_name: trimmedName };
    if (trimmedEmail !== currentUser.email) updates.email = trimmedEmail;
    if (nextPassword) updates.password = nextPassword;

    if (!updates.email && !updates.password && !updates.data) {
      setProfileStatus({ tone: 'info', text: 'No account changes to save yet.' });
      return;
    }

    setProfileLoading(true);
    setProfileStatus(null);

    try {
      const { error } = await client.auth.updateUser(updates);
      if (error) throw error;

      setCurrentUser((current) => ({
        ...current,
        name: updates.data?.full_name || current.name,
        email: updates.email || current.email
      }));
      setProfilePassword('');
      setProfileConfirmPassword('');
      setProfileStatus({
        tone: 'success',
        text: updates.email
          ? 'Account updated. Check your email if Supabase asks you to confirm the new address.'
          : 'Account updated successfully.'
      });
    } catch (error) {
      if (isRecoverableSessionError(error)) {
        await recoverBrokenSession();
        return;
      }

      const message = getErrorMessage(error, 'Unable to update your account.');
      setProfileStatus({ tone: 'error', text: message });
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!client) return;

    if (resetPasswordValue.trim().length < 5) {
      setResetPasswordStatus({ tone: 'error', text: 'Password must be at least 5 characters.' });
      return;
    }

    if (resetPasswordValue !== resetPasswordConfirm) {
      setResetPasswordStatus({ tone: 'error', text: 'Passwords do not match.' });
      return;
    }

    setResetPasswordLoading(true);
    setResetPasswordStatus(null);

    try {
      const { error } = await client.auth.updateUser({ password: resetPasswordValue });
      if (error) throw error;

      setResetPasswordValue('');
      setResetPasswordConfirm('');
      setResetPasswordStatus({ tone: 'success', text: 'Password updated. You can now continue using LearnSelf.' });
      setResetPasswordOpen(false);
      setLoginStatus({ tone: 'success', text: 'Password updated successfully.' });
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to update password.');
      setResetPasswordStatus({ tone: 'error', text: message });
    } finally {
      setResetPasswordLoading(false);
    }
  }

  async function handleAddAssignment() {
    if (!validateAssignmentForm() || !client || !addForm.difficulty) return;
    setAddLoading(true);

    try {
      const { data: userData, error: userError } = await client.auth.getUser();
      if (userError) throw userError;

      const userId = userData.user?.id || currentUser.id;
      if (!userId) {
        throw new Error('You are no longer signed in. Please log in again and retry.');
      }

      const saved = await insertAssignment(
        client,
        {
          id: '',
          name: addForm.name.trim(),
          cls: addForm.cls.trim(),
          difficulty: addForm.difficulty,
          ad: addForm.ad,
          due: addForm.due,
          desc: addForm.desc.trim(),
          status: 'active'
        },
        userId
      );

      setAssignments((current) => [...current, saved]);
      setAddModalOpen(false);
      setAddForm(emptyAssignmentForm);
      setAddFormErrors({});
    } catch (error) {
      if (isRecoverableSessionError(error)) {
        await recoverBrokenSession();
        return;
      }

      const message = getErrorMessage(error, 'Could not save assignment.');
      setLoginStatus({ tone: 'error', text: `Could not save assignment: ${message}` });
    } finally {
      setAddLoading(false);
    }
  }

  async function moveAssignments(status: 'finished' | 'trashed') {
    if (!client || !selectedIds.length) return;

    try {
      const { data: userData, error: userError } = await client.auth.getUser();
      if (userError) throw userError;
      const userId = userData.user?.id || currentUser.id;
      if (!userId) {
        throw new Error('You are no longer signed in. Please log in again and retry.');
      }

      await updateAssignmentStatuses(client, userId, selectedIds, status);
      const moving = assignments.filter((item) => selectedIds.includes(item.id)).map((item) => ({ ...item, status }));
      setAssignments((current) => current.filter((item) => !selectedIds.includes(item.id)));
      if (status === 'finished') setFinished((current) => [...current, ...moving]);
      if (status === 'trashed') setTrash((current) => [...current, ...moving]);
      setSelectedIds([]);
    } catch (error) {
      if (isRecoverableSessionError(error)) {
        await recoverBrokenSession();
        return;
      }

      const message = getErrorMessage(error, 'Action failed.');
      setLoginStatus({ tone: 'error', text: `Could not update assignments: ${message}` });
    }
  }

  async function handleLogout() {
    if (!client) {
      resetAppState();
      return;
    }

    setLogoutLoading(true);

    try {
      const signOutPromise = client.auth.signOut();
      const timeoutPromise = new Promise<{ error: Error }>((resolve) => {
        window.setTimeout(() => resolve({ error: new Error('Logout timed out') }), 5000);
      });
      const { error } = await Promise.race([signOutPromise, timeoutPromise]);
      if (error) {
        const isMissingSession = error.message?.toLowerCase().includes('session') || isRecoverableSessionError(error);
        if (isMissingSession) {
          const { error: localError } = await client.auth.signOut({ scope: 'local' });
          if (localError && !localError.message?.toLowerCase().includes('session')) {
            throw localError;
          }
        } else {
          throw error;
        }
      }
      resetAppState();
    } catch (error) {
      resetAppState();
      setLoginStatus({
        tone: 'info',
        text: isRecoverableSessionError(error)
          ? 'The saved session was invalid, so we signed you out locally.'
          : 'Signed out locally, but Supabase did not confirm the logout cleanly.'
      });
    } finally {
      setLogoutLoading(false);
    }
  }

  function handleToggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? sortedAssignments.map((item) => item.id) : []);
  }

  function handleToggleSelected(id: string, checked: boolean) {
    setSelectedIds((current) => checked ? [...current, id] : current.filter((item) => item !== id));
  }

  function renderView() {
    switch (activeView) {
      case 'dashboard':
        return (
          <DashboardView
            assignments={sortedAssignments}
            selectedIds={selectedIds}
            onToggleSelected={handleToggleSelected}
            onToggleSelectAll={handleToggleSelectAll}
            onOpenAddModal={() => { setAddForm(emptyAssignmentForm); setAddFormErrors({}); setAddModalOpen(true); }}
            onOpenDetails={setSelectedAssignment}
            onBulkFinish={() => void moveAssignments('finished')}
            onBulkDelete={() => void moveAssignments('trashed')}
          />
        );
      case 'finished':
        return <SimpleTableView id="finished-table" title="Finished" subtitle="Assignments you have marked as complete." accentClass="green-soft" assignments={finished} showDifficulty emptyMessage="No finished assignments yet." />;
      case 'trash':
        return <SimpleTableView id="trash-table" title="Trash" subtitle="Deleted assignments. They are archived here." accentClass="red-soft" assignments={trash} emptyMessage="Trash is empty." />;
      case 'tools':
        return <ToolsView />;
      case 'help':
        return <HelpView />;
      case 'profile':
        return (
          <ProfileView
            currentUser={currentUser}
            activeCount={assignments.length}
            finishedCount={finished.length}
            profileName={profileName}
            profileEmail={profileEmail}
            profilePassword={profilePassword}
            profileConfirmPassword={profileConfirmPassword}
            loading={profileLoading}
            status={profileStatus}
            onNameChange={setProfileName}
            onEmailChange={setProfileEmail}
            onPasswordChange={setProfilePassword}
            onConfirmPasswordChange={setProfileConfirmPassword}
            onSubmit={() => void handleProfileSave()}
          />
        );
      case 'settings':
        return <SettingsView onLogout={() => void handleLogout()} logoutLoading={logoutLoading} />;
      default:
        return null;
    }
  }

  const isLoggedIn = Boolean(currentUser.id);

  return (
    <>
      {!isLoggedIn ? (
        <>
          <AuthPage
            isSignup={isSignup}
            loginEmail={loginEmail}
            loginPassword={loginPassword}
            signupName={signupName}
            signupEmail={signupEmail}
            signupPassword={signupPassword}
            showLoginPassword={showLoginPassword}
            showSignupPassword={showSignupPassword}
            loginErrors={loginErrors}
            signupErrors={signupErrors}
            loginStatus={isCheckingSession ? { tone: 'info', text: 'Checking session...' } : loginStatus}
            signupStatus={signupStatus}
            loginLoading={loginLoading || isCheckingSession}
            signupLoading={signupLoading}
            onToggleMode={(nextSignup) => {
              setIsSignup(nextSignup);
              setLoginErrors({});
              setSignupErrors({});
              setSignupStatus(null);
              setLoginStatus(null);
            }}
            onLoginEmailChange={setLoginEmail}
            onLoginPasswordChange={setLoginPassword}
            onSignupNameChange={setSignupName}
            onSignupEmailChange={setSignupEmail}
            onSignupPasswordChange={setSignupPassword}
            onToggleLoginPassword={() => setShowLoginPassword((current) => !current)}
            onToggleSignupPassword={() => setShowSignupPassword((current) => !current)}
            onLoginSubmit={() => void handleLogin()}
            onSignupSubmit={() => void handleSignup()}
            onForgotPasswordOpen={() => {
              setForgotPasswordOpen(true);
              setForgotPasswordSuccess(false);
              setForgotPasswordError(undefined);
              setForgotPasswordStatus(null);
            }}
          />
          <ForgotPasswordModal
            open={forgotPasswordOpen}
            email={forgotPasswordEmail}
            loading={forgotPasswordLoading}
            success={forgotPasswordSuccess}
            error={forgotPasswordError}
            status={forgotPasswordStatus}
            onEmailChange={setForgotPasswordEmail}
            onClose={() => {
              setForgotPasswordOpen(false);
              setForgotPasswordSuccess(false);
              setForgotPasswordStatus(null);
            }}
            onSubmit={() => void handleForgotPassword()}
          />
        </>
      ) : (
        <AppShell currentView={activeView} currentUser={currentUser} status={loginStatus} onViewChange={setActiveView}>
          {renderView()}
        </AppShell>
      )}

      <AddAssignmentModal
        open={addModalOpen}
        values={addForm}
        errors={addFormErrors}
        loading={addLoading}
        onClose={() => setAddModalOpen(false)}
        onChange={(field, value) => setAddForm((current) => ({ ...current, [field]: value }))}
        onSubmit={() => void handleAddAssignment()}
      />
      <AssignmentDetailModal assignment={selectedAssignment} onClose={() => setSelectedAssignment(null)} />
      <ResetPasswordModal
        open={resetPasswordOpen}
        password={resetPasswordValue}
        confirmPassword={resetPasswordConfirm}
        loading={resetPasswordLoading}
        status={resetPasswordStatus}
        onPasswordChange={setResetPasswordValue}
        onConfirmPasswordChange={setResetPasswordConfirm}
        onClose={() => {
          setResetPasswordOpen(false);
          setResetPasswordStatus(null);
        }}
        onSubmit={() => void handleResetPassword()}
      />
    </>
  );
}
