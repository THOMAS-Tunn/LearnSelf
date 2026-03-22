import { useEffect, useMemo, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AppShell } from './components/layout/AppShell';
import { AuthPage } from './components/auth/AuthPage';
import { DashboardView } from './components/dashboard/DashboardView';
import { ForgotPasswordModal } from './components/modals/ForgotPasswordModal';
import { AddAssignmentModal } from './components/modals/AddAssignmentModal';
import { AssignmentDetailModal } from './components/modals/AssignmentDetailModal';
import { ResetPasswordModal } from './components/modals/ResetPasswordModal';
import { CommunityView } from './components/views/CommunityView';
import { FriendsView } from './components/views/FriendsView';
import { SimpleTableView } from './components/views/SimpleTableView';
import { ToolsView } from './components/views/ToolsView';
import { HelpView } from './components/views/HelpView';
import { ProfileView } from './components/views/ProfileView';
import { SettingsView } from './components/views/SettingsView';
import {
  buildAssignmentPriorityState,
  createEmptyAssignmentForm,
  getInitialGradingMode,
  getInitialUser,
  getNextRepeatOccurrence,
  getRepeatAnchorDate,
  getRepeatDueOffsetDays,
  saveGradingMode
} from './lib/assignment';
import {
  deleteCommunityPost,
  fetchCommunityPosts,
  insertCommunityComment,
  insertCommunityPost,
  setCommunityCommentFavorite,
  setCommunityCommentLike,
  setCommunityPostFavorite,
  setCommunityPostHidden,
  setCommunityPostLike,
  setCommunityPostPinned
} from './lib/community';
import { addFriend, fetchFriends, removeFriendships, searchDirectoryProfiles, syncUserDirectoryProfile } from './lib/social';
import {
  createSupabaseBrowserClient,
  deleteAssignmentRepeatRule,
  deleteAssignments,
  fetchAssignments,
  getInitialBrowserSession,
  getSupabaseConfig,
  insertAssignment,
  insertAssignmentRepeatRule,
  mapUser,
  syncRecurringAssignments,
  updateAssignmentStatuses
} from './lib/supabase';
import type {
  Assignment,
  AssignmentFormValues,
  AssignmentRepeatRulePayload,
  CommunityComment,
  CommunityCommentSort,
  CommunityFeedSection,
  CommunityPost,
  CommunityPostFormValues,
  FriendRecord,
  FriendSearchResult,
  GradingMode,
  StatusMessage,
  UserProfile,
  ViewName
} from './types';

const emptyCommunityPostForm: CommunityPostFormValues = {
  title: '',
  body: ''
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

function formatAssignmentError(error: unknown, fallback: string) {
  const message = getErrorMessage(error, fallback);
  const normalized = message.toLowerCase();

  if (
    normalized.includes('assignment_repeat_rules')
    || normalized.includes('repeat_enabled')
    || normalized.includes('repeat_every')
    || normalized.includes('repeat_time')
    || normalized.includes('repeat_rule')
    || normalized.includes('sync_recurring_assignments_for_current_user')
  ) {
    return 'Recurring assignments are not set up yet. Run the SQL in supabase/recurring_assignments.sql, then try again.';
  }

  return message;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    const message = 'message' in error && typeof error.message === 'string' ? error.message.trim() : '';
    const details = 'details' in error && typeof error.details === 'string' ? error.details.trim() : '';
    const hint = 'hint' in error && typeof error.hint === 'string' ? error.hint.trim() : '';
    const code = 'code' in error && typeof error.code === 'string' ? error.code.trim() : '';
    const pieces = [
      message,
      details && details !== message ? details : '',
      hint ? `Hint: ${hint}` : '',
      code ? `Code: ${code}` : ''
    ].filter(Boolean);

    if (pieces.length) {
      return pieces.join(' ');
    }
  }

  return fallback;
}

function formatSocialError(error: unknown, fallback: string) {
  const message = getErrorMessage(error, fallback);
  const normalized = message.toLowerCase();

  if (
    normalized.includes('community_')
    || normalized.includes('profiles')
    || normalized.includes('friendships')
  ) {
    return 'Social features are not set up yet. Run the SQL in supabase/community.sql, then refresh this tab.';
  }

  return message;
}

function updateCommunityAuthorSnapshots(posts: CommunityPost[], nextUser: UserProfile) {
  return posts.map((post) => ({
    ...post,
    authorName: post.userId === nextUser.id ? nextUser.name : post.authorName,
    authorEmail: post.userId === nextUser.id ? nextUser.email : post.authorEmail,
    authorAvatarUrl: post.userId === nextUser.id ? nextUser.avatarUrl : post.authorAvatarUrl,
    comments: post.comments.map((comment) => ({
      ...comment,
      authorName: comment.userId === nextUser.id ? nextUser.name : comment.authorName,
      authorEmail: comment.userId === nextUser.id ? nextUser.email : comment.authorEmail,
      authorAvatarUrl: comment.userId === nextUser.id ? nextUser.avatarUrl : comment.authorAvatarUrl
    }))
  }));
}

function filterCommunityPosts(
  posts: CommunityPost[],
  section: CommunityFeedSection,
  currentUserId: string,
  friendIds: string[]
) {
  const friendIdSet = new Set(friendIds);

  return posts.filter((post) => {
    switch (section) {
      case 'favorite-posts':
        return post.status === 'open' && post.favoritedByCurrentUser;
      case 'favorite-comments':
        return post.status === 'open' && post.comments.some((comment) => comment.favoritedByCurrentUser);
      case 'my-posts':
        return post.status === 'open' && post.userId === currentUserId;
      case 'friend-posts':
        return post.status === 'open' && friendIdSet.has(post.userId);
      case 'archived':
        return post.status === 'open' && post.hiddenByCurrentUser;
      case 'deleted':
        return post.status === 'deleted' && post.userId === currentUserId;
      default:
        return post.status === 'open' && !post.hiddenByCurrentUser;
    }
  }).sort((left, right) => {
    if (section !== 'archived' && section !== 'deleted' && left.pinnedByCurrentUser !== right.pinnedByCurrentUser) {
      return left.pinnedByCurrentUser ? -1 : 1;
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
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
  const [addForm, setAddForm] = useState<AssignmentFormValues>(() => createEmptyAssignmentForm());
  const [addFormErrors, setAddFormErrors] = useState<Partial<Record<keyof AssignmentFormValues, string>>>({});
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [gradingMode, setGradingMode] = useState<GradingMode>(getInitialGradingMode);
  const [loginStatus, setLoginStatus] = useState<StatusMessage | null>(null);
  const [signupStatus, setSignupStatus] = useState<StatusMessage | null>(null);
  const [forgotPasswordStatus, setForgotPasswordStatus] = useState<StatusMessage | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileConfirmPassword, setProfileConfirmPassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileStatus, setProfileStatus] = useState<StatusMessage | null>(null);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityLoadAttempted, setCommunityLoadAttempted] = useState(false);
  const [communityStatus, setCommunityStatus] = useState<StatusMessage | null>(null);
  const [communitySection, setCommunitySection] = useState<CommunityFeedSection>('all');
  const [communityPostValues, setCommunityPostValues] = useState<CommunityPostFormValues>(emptyCommunityPostForm);
  const [communityPostErrors, setCommunityPostErrors] = useState<Partial<Record<keyof CommunityPostFormValues, string>>>({});
  const [communityPosting, setCommunityPosting] = useState(false);
  const [communityCommentDrafts, setCommunityCommentDrafts] = useState<Record<string, string>>({});
  const [communityCommentErrors, setCommunityCommentErrors] = useState<Record<string, string | undefined>>({});
  const [communityCommentSorts, setCommunityCommentSorts] = useState<Record<string, CommunityCommentSort>>({});
  const [communityCommentLoadingId, setCommunityCommentLoadingId] = useState<string | null>(null);
  const [communityActionLoadingKey, setCommunityActionLoadingKey] = useState<string | null>(null);
  const [friends, setFriends] = useState<FriendRecord[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsLoadAttempted, setFriendsLoadAttempted] = useState(false);
  const [friendsStatus, setFriendsStatus] = useState<StatusMessage | null>(null);
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [friendSearchResults, setFriendSearchResults] = useState<FriendSearchResult[]>([]);
  const [friendSearchLoading, setFriendSearchLoading] = useState(false);
  const [friendSearchStatus, setFriendSearchStatus] = useState<StatusMessage | null>(null);
  const [selectedFriendProfile, setSelectedFriendProfile] = useState<FriendSearchResult | null>(null);
  const [selectedFriendshipIds, setSelectedFriendshipIds] = useState<string[]>([]);
  const [friendActionLoadingKey, setFriendActionLoadingKey] = useState<string | null>(null);
  const hydratedSessionKeyRef = useRef('');
  const sessionLoadRequestRef = useRef(0);

  const assignmentPriorityState = useMemo(
    () => buildAssignmentPriorityState(assignments, gradingMode),
    [assignments, gradingMode]
  );
  const sortedAssignments = assignmentPriorityState.sortedAssignments;
  const selectableAssignments = useMemo(() => {
    switch (activeView) {
      case 'finished':
        return finished;
      case 'trash':
        return trash;
      default:
        return sortedAssignments;
    }
  }, [activeView, finished, sortedAssignments, trash]);
  const friendIds = useMemo(() => friends.map((friend) => friend.userId), [friends]);
  const visibleCommunityPosts = useMemo(
    () => filterCommunityPosts(communityPosts, communitySection, currentUser.id, friendIds),
    [communityPosts, communitySection, currentUser.id, friendIds]
  );

  useEffect(() => {
    setSelectedIds([]);
  }, [activeView]);

  useEffect(() => {
    saveGradingMode(gradingMode);
  }, [gradingMode]);

  function isRecoverableSessionError(error: unknown) {
    const message = getErrorMessage(error, '').toLowerCase();
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
    sessionLoadRequestRef.current += 1;
    hydratedSessionKeyRef.current = '';

    try {
      await client?.auth.signOut({ scope: 'local' });
    } catch {
      // Ignore sign-out cleanup failures and continue resetting local UI state.
    }

    resetAppState();
    setLoginStatus({ tone: 'info', text: message });
  }

  function scheduleSessionHydration(activeClient: SupabaseClient, userId: string, profile: UserProfile) {
    window.setTimeout(() => {
      void hydrateUserSession(activeClient, userId, profile);
    }, 0);
  }

  function updateCommunityPost(postId: string, updater: (post: CommunityPost) => CommunityPost) {
    setCommunityPosts((current) => current.map((post) => post.id === postId ? updater(post) : post));
  }

  function updateCommunityComment(postId: string, commentId: string, updater: (comment: CommunityComment) => CommunityComment) {
    setCommunityPosts((current) => current.map((post) => (
      post.id === postId
        ? { ...post, comments: post.comments.map((comment) => comment.id === commentId ? updater(comment) : comment) }
        : post
    )));
  }

  useEffect(() => {
    let isDisposed = false;
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

    void getInitialBrowserSession(supabaseClient)
      .then(async (session) => {
        if (isDisposed || !session?.user) return;
        await hydrateUserSession(supabaseClient, session.user.id, mapUser(session.user));
      })
      .catch((error) => {
        if (isDisposed) return;
        setLoginStatus({ tone: 'error', text: getErrorMessage(error, 'Unable to restore your session.') });
      })
      .finally(() => {
        if (!isDisposed) {
          setIsCheckingSession(false);
        }
      });

    const { data: authListener } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (isDisposed || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        return;
      }

      if (event === 'PASSWORD_RECOVERY') {
        setResetPasswordOpen(true);
        setResetPasswordStatus({ tone: 'info', text: 'Recovery link accepted. Enter your new password below.' });
      }
      if (event === 'SIGNED_OUT') {
        resetAppState();
        return;
      }
      if (session?.user) {
        scheduleSessionHydration(supabaseClient, session.user.id, mapUser(session.user));
      }
    });

    return () => {
      isDisposed = true;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (activeView !== 'community' || !client || !currentUser.id || communityLoading || communityLoadAttempted) {
      return;
    }

    void loadCommunity();
  }, [activeView, client, currentUser.id, communityLoading, communityLoadAttempted]);

  useEffect(() => {
    if ((activeView !== 'community' && activeView !== 'friends') || !client || !currentUser.id || friendsLoading || friendsLoadAttempted) {
      return;
    }

    void loadFriends();
  }, [activeView, client, currentUser.id, friendsLoading, friendsLoadAttempted]);

  async function hydrateUserSession(activeClient: SupabaseClient, userId: string, profile: UserProfile) {
    const sessionKey = `${userId}:${profile.email}:${profile.name}:${profile.avatarUrl}`;
    if (hydratedSessionKeyRef.current === sessionKey) {
      return;
    }

    hydratedSessionKeyRef.current = sessionKey;
    const requestId = ++sessionLoadRequestRef.current;
    let syncedProfile = profile;

    try {
      syncedProfile = await syncUserDirectoryProfile(activeClient, profile);
    } catch {
      // Keep the auth profile if the social tables are not ready yet.
    }

    setCurrentUser(syncedProfile);
    setProfileName(syncedProfile.name);
    setProfileEmail(syncedProfile.email);
    setProfileAvatarUrl(syncedProfile.avatarUrl);
    setProfilePassword('');
    setProfileConfirmPassword('');
    setProfileStatus(null);
    setLoginStatus(null);
    setSignupStatus(null);
    setLoginPassword('');
    setSignupPassword('');
    setCommunityPosts([]);
    setCommunityLoading(false);
    setCommunityLoadAttempted(false);
    setCommunityStatus(null);
    setCommunitySection('all');
    setCommunityPostValues(emptyCommunityPostForm);
    setCommunityPostErrors({});
    setCommunityPosting(false);
    setCommunityCommentDrafts({});
    setCommunityCommentErrors({});
    setCommunityCommentSorts({});
    setCommunityCommentLoadingId(null);
    setCommunityActionLoadingKey(null);
    setFriends([]);
    setFriendsLoading(false);
    setFriendsLoadAttempted(false);
    setFriendsStatus(null);
    setFriendSearchQuery('');
    setFriendSearchResults([]);
    setFriendSearchLoading(false);
    setFriendSearchStatus(null);
    setSelectedFriendProfile(null);
    setSelectedFriendshipIds([]);
    setFriendActionLoadingKey(null);

    try {
      await syncRecurringAssignments(activeClient);
      const allAssignments = await fetchAssignments(activeClient, userId);
      if (requestId !== sessionLoadRequestRef.current) return;

      setAssignments(allAssignments.filter((item) => item.status === 'active'));
      setFinished(allAssignments.filter((item) => item.status === 'finished'));
      setTrash(allAssignments.filter((item) => item.status === 'trashed'));
      setActiveView('dashboard');
      setSelectedIds([]);
    } catch (error) {
      if (requestId !== sessionLoadRequestRef.current) return;

      if (isRecoverableSessionError(error)) {
        hydratedSessionKeyRef.current = '';
        await recoverBrokenSession();
        return;
      }

      hydratedSessionKeyRef.current = '';
      const message = formatAssignmentError(error, 'Unable to load assignments.');
      setLoginStatus({ tone: 'error', text: `Signed in, but loading assignments failed: ${message}` });
      setAssignments([]);
      setFinished([]);
      setTrash([]);
    }
  }

  function resetAppState() {
    sessionLoadRequestRef.current += 1;
    hydratedSessionKeyRef.current = '';
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
    setAddForm(createEmptyAssignmentForm());
    setAddFormErrors({});
    setAddLoading(false);
    setLogoutLoading(false);
    setProfileName('');
    setProfileEmail('');
    setProfileAvatarUrl('');
    setProfilePassword('');
    setProfileConfirmPassword('');
    setProfileLoading(false);
    setProfileStatus(null);
    setCommunityPosts([]);
    setCommunityLoading(false);
    setCommunityLoadAttempted(false);
    setCommunityStatus(null);
    setCommunitySection('all');
    setCommunityPostValues(emptyCommunityPostForm);
    setCommunityPostErrors({});
    setCommunityPosting(false);
    setCommunityCommentDrafts({});
    setCommunityCommentErrors({});
    setCommunityCommentSorts({});
    setCommunityCommentLoadingId(null);
    setCommunityActionLoadingKey(null);
    setFriends([]);
    setFriendsLoading(false);
    setFriendsLoadAttempted(false);
    setFriendsStatus(null);
    setFriendSearchQuery('');
    setFriendSearchResults([]);
    setFriendSearchLoading(false);
    setFriendSearchStatus(null);
    setSelectedFriendProfile(null);
    setSelectedFriendshipIds([]);
    setFriendActionLoadingKey(null);
  }

  function handleAddFormChange<K extends keyof AssignmentFormValues>(field: K, value: AssignmentFormValues[K]) {
    setAddForm((current) => {
      const next: AssignmentFormValues = {
        ...current,
        [field]: value
      } as AssignmentFormValues;

      if (field === 'repeatEnabled' && !value) {
        next.repeatEvery = '';
        next.repeatDaysOfWeek = [];
        next.repeatDaysOfMonth = [];
      }

      if (field === 'repeatEvery') {
        if (value !== 'days-of-week') {
          next.repeatDaysOfWeek = [];
        }
        if (value !== 'days-of-month') {
          next.repeatDaysOfMonth = [];
        }
      }

      if (field === 'repeatDaysOfWeek') {
        next.repeatDaysOfWeek = [...new Set(value as number[])].sort((left, right) => left - right);
      }

      if (field === 'repeatDaysOfMonth') {
        next.repeatDaysOfMonth = [...new Set(value as number[])].sort((left, right) => left - right);
      }

      return next;
    });

    setAddFormErrors((current) => ({
      ...current,
      [field]: undefined,
      ...(field === 'repeatEnabled' || field === 'repeatEvery'
        ? { repeatEvery: undefined, repeatTime: undefined, repeatDaysOfWeek: undefined, repeatDaysOfMonth: undefined, due: undefined }
        : {}),
      ...(field === 'ad' || field === 'due'
        ? { due: undefined, repeatDaysOfWeek: undefined, repeatDaysOfMonth: undefined }
        : {})
    }));
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
    if (!addForm.repeatEnabled && !addForm.due) {
      nextErrors.due = 'Due date is required.';
    }

    if (addForm.repeatEnabled && !addForm.ad && !addForm.due) {
      nextErrors.due = 'Set either an assign date or a due date to anchor the repeat schedule.';
    }

    const assignedDate = addForm.ad ? new Date(`${addForm.ad}T00:00:00`) : null;
    const dueDate = addForm.due ? new Date(`${addForm.due}T00:00:00`) : null;

    if (
      assignedDate
      && dueDate
      && !Number.isNaN(assignedDate.getTime())
      && !Number.isNaN(dueDate.getTime())
      && dueDate.getTime() < assignedDate.getTime()
    ) {
      nextErrors.due = 'Due date needs to be on or after the assign date.';
    }

    if (addForm.repeatEnabled) {
      if (!addForm.repeatEvery) {
        nextErrors.repeatEvery = 'Choose how this assignment should repeat.';
      }

      if (!/^\d{2}:\d{2}$/.test(addForm.repeatTime.trim())) {
        nextErrors.repeatTime = 'Choose a valid repeat time.';
      }

      const anchorDate = getRepeatAnchorDate(addForm);
      const anchor = anchorDate ? new Date(`${anchorDate}T00:00:00`) : null;

      if (addForm.repeatEvery === 'days-of-week') {
        if (!addForm.repeatDaysOfWeek.length) {
          nextErrors.repeatDaysOfWeek = 'Pick at least one weekday.';
        } else if (anchor && !addForm.repeatDaysOfWeek.includes(anchor.getDay())) {
          nextErrors.repeatDaysOfWeek = 'Include the first assignment day so the repeat schedule matches the starting date.';
        }
      }

      if (addForm.repeatEvery === 'days-of-month') {
        if (!addForm.repeatDaysOfMonth.length) {
          nextErrors.repeatDaysOfMonth = 'Pick at least one day of the month.';
        } else if (anchor && !addForm.repeatDaysOfMonth.includes(anchor.getDate())) {
          nextErrors.repeatDaysOfMonth = 'Include the first assignment date so the repeat schedule matches the starting date.';
        }
      }
    }

    setAddFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function buildRepeatRulePayload(): AssignmentRepeatRulePayload | null {
    if (!addForm.repeatEnabled || !addForm.difficulty || !addForm.repeatEvery) {
      return null;
    }

    const anchorDate = getRepeatAnchorDate(addForm);
    const nextOccurrenceOn = getNextRepeatOccurrence(
      anchorDate,
      addForm.repeatEvery,
      addForm.repeatDaysOfWeek,
      addForm.repeatDaysOfMonth
    );

    if (!anchorDate || !nextOccurrenceOn) {
      return null;
    }

    return {
      name: addForm.name.trim(),
      cls: addForm.cls.trim(),
      difficulty: addForm.difficulty,
      desc: addForm.desc.trim(),
      repeatEvery: addForm.repeatEvery,
      repeatTime: addForm.repeatTime,
      repeatDaysOfWeek: addForm.repeatDaysOfWeek,
      repeatDaysOfMonth: addForm.repeatDaysOfMonth,
      repeatTimezone: addForm.repeatTimezone,
      anchorDate,
      usesAssignedDate: Boolean(addForm.ad),
      dueOffsetDays: getRepeatDueOffsetDays(addForm),
      nextOccurrenceOn
    };
  }

  function validateCommunityPostForm() {
    const nextErrors: typeof communityPostErrors = {};
    if (communityPostValues.title.trim().length < 3) nextErrors.title = 'Use at least 3 characters for the title.';
    if (communityPostValues.body.trim().length < 10) nextErrors.body = 'Please add a little more detail so others know how to help.';
    setCommunityPostErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function loadCommunity(force = false) {
    if (!client || !currentUser.id || communityLoading || (!force && communityLoadAttempted)) return;

    setCommunityLoading(true);
    setCommunityLoadAttempted(true);
    setCommunityStatus(null);

    try {
      const posts = await fetchCommunityPosts(client, currentUser.id);
      setCommunityPosts(posts);
    } catch (error) {
      if (isRecoverableSessionError(error)) {
        await recoverBrokenSession();
        return;
      }

      setCommunityStatus({
        tone: 'error',
        text: formatSocialError(error, 'Unable to load the community feed.')
      });
    } finally {
      setCommunityLoading(false);
    }
  }

  async function loadFriends(force = false) {
    if (!client || !currentUser.id || friendsLoading || (!force && friendsLoadAttempted)) return;

    setFriendsLoading(true);
    setFriendsLoadAttempted(true);
    setFriendsStatus(null);

    try {
      const nextFriends = await fetchFriends(client, currentUser.id);
      setFriends(nextFriends);
    } catch (error) {
      if (isRecoverableSessionError(error)) {
        await recoverBrokenSession();
        return;
      }

      setFriendsStatus({
        tone: 'error',
        text: formatSocialError(error, 'Unable to load your friends yet.')
      });
    } finally {
      setFriendsLoading(false);
    }
  }

  async function handleCommunityPost() {
    if (!client || !currentUser.id || !validateCommunityPostForm()) return;

    setCommunityPosting(true);
    setCommunityStatus(null);

    try {
      const created = await insertCommunityPost(client, communityPostValues, currentUser);
      setCommunityPosts((current) => [{ ...created, comments: [] }, ...current]);
      setCommunityPostValues(emptyCommunityPostForm);
      setCommunityPostErrors({});
      setCommunitySection('all');
      setCommunityLoadAttempted(true);
      setCommunityStatus({ tone: 'success', text: 'Your post is now live in the community.' });
    } catch (error) {
      if (isRecoverableSessionError(error)) {
        await recoverBrokenSession();
        return;
      }

      setCommunityStatus({
        tone: 'error',
        text: formatSocialError(error, 'Unable to post your request.')
      });
    } finally {
      setCommunityPosting(false);
    }
  }

  async function handleCommunityComment(postId: string) {
    if (!client || !currentUser.id) return;

    const targetPost = communityPosts.find((post) => post.id === postId);
    if (!targetPost || targetPost.status !== 'open') {
      setCommunityStatus({ tone: 'info', text: 'Comments are only available on open posts.' });
      return;
    }

    const draft = communityCommentDrafts[postId]?.trim() || '';
    if (!draft) {
      setCommunityCommentErrors((current) => ({ ...current, [postId]: 'Add a comment before posting.' }));
      return;
    }

    setCommunityCommentLoadingId(postId);
    setCommunityCommentErrors((current) => ({ ...current, [postId]: undefined }));
    setCommunityStatus(null);

    try {
      const created = await insertCommunityComment(client, postId, draft, currentUser);
      updateCommunityPost(postId, (post) => ({ ...post, comments: [...post.comments, created] }));
      setCommunityCommentDrafts((current) => ({ ...current, [postId]: '' }));
    } catch (error) {
      if (isRecoverableSessionError(error)) {
        await recoverBrokenSession();
        return;
      }

      setCommunityStatus({
        tone: 'error',
        text: formatSocialError(error, 'Unable to post your comment.')
      });
    } finally {
      setCommunityCommentLoadingId(null);
    }
  }

  async function handleCommunityDelete(post: CommunityPost) {
    if (!client || !currentUser.id) return;

    const actionKey = `delete-post:${post.id}`;
    setCommunityActionLoadingKey(actionKey);
    setCommunityStatus(null);

    try {
      await deleteCommunityPost(client, post.id, currentUser.id);
      updateCommunityPost(post.id, (current) => ({
        ...current,
        status: 'deleted',
        deletedAt: new Date().toISOString()
      }));
      setCommunityStatus({ tone: 'success', text: 'The post was moved to Deleted.' });
    } catch (error) {
      if (isRecoverableSessionError(error)) {
        await recoverBrokenSession();
        return;
      }

      setCommunityStatus({
        tone: 'error',
        text: formatSocialError(error, 'Unable to delete this post.')
      });
    } finally {
      setCommunityActionLoadingKey(null);
    }
  }

  async function handleCommunityPostHiddenToggle(post: CommunityPost) {
    if (!client || !currentUser.id) return;

    const actionKey = `hide-post:${post.id}`;
    const nextHidden = !post.hiddenByCurrentUser;
    setCommunityActionLoadingKey(actionKey);
    setCommunityStatus(null);

    try {
      await setCommunityPostHidden(client, post.id, currentUser.id, nextHidden);
      updateCommunityPost(post.id, (current) => ({ ...current, hiddenByCurrentUser: nextHidden }));
      setCommunityStatus({ tone: 'success', text: nextHidden ? 'Post moved to Archived.' : 'Post restored to the main feed.' });
    } catch (error) {
      if (isRecoverableSessionError(error)) {
        await recoverBrokenSession();
        return;
      }

      setCommunityStatus({
        tone: 'error',
        text: formatSocialError(error, 'Unable to update this post right now.')
      });
    } finally {
      setCommunityActionLoadingKey(null);
    }
  }

  async function handleCommunityPostPinnedToggle(post: CommunityPost) {
    if (!client || !currentUser.id) return;

    const actionKey = `pin-post:${post.id}`;
    const nextPinned = !post.pinnedByCurrentUser;
    setCommunityActionLoadingKey(actionKey);
    setCommunityStatus(null);

    try {
      await setCommunityPostPinned(client, post.id, currentUser.id, nextPinned);
      updateCommunityPost(post.id, (current) => ({ ...current, pinnedByCurrentUser: nextPinned }));
      setCommunityStatus({ tone: 'success', text: nextPinned ? 'Post pinned to the top of your feed.' : 'Post removed from your pinned posts.' });
    } catch (error) {
      if (isRecoverableSessionError(error)) {
        await recoverBrokenSession();
        return;
      }

      setCommunityStatus({
        tone: 'error',
        text: formatSocialError(error, 'Unable to update this pin right now.')
      });
    } finally {
      setCommunityActionLoadingKey(null);
    }
  }

  async function handleCommunityPostFavoriteToggle(post: CommunityPost) {
    if (!client || !currentUser.id) return;

    const actionKey = `favorite-post:${post.id}`;
    const nextFavorite = !post.favoritedByCurrentUser;
    setCommunityActionLoadingKey(actionKey);
    setCommunityStatus(null);

    try {
      await setCommunityPostFavorite(client, post.id, currentUser.id, nextFavorite);
      updateCommunityPost(post.id, (current) => ({ ...current, favoritedByCurrentUser: nextFavorite }));
      setCommunityStatus({ tone: 'success', text: nextFavorite ? 'Post added to Favorite Posts.' : 'Post removed from Favorite Posts.' });
    } catch (error) {
      if (isRecoverableSessionError(error)) {
        await recoverBrokenSession();
        return;
      }

      setCommunityStatus({
        tone: 'error',
        text: formatSocialError(error, 'Unable to update favorites right now.')
      });
    } finally {
      setCommunityActionLoadingKey(null);
    }
  }

  async function handleCommunityPostLikeToggle(post: CommunityPost) {
    if (!client || !currentUser.id) return;

    const actionKey = `like-post:${post.id}`;
    const nextLiked = !post.likedByCurrentUser;
    setCommunityActionLoadingKey(actionKey);
    setCommunityStatus(null);

    try {
      await setCommunityPostLike(client, post.id, currentUser.id, nextLiked);
      updateCommunityPost(post.id, (current) => ({
        ...current,
        likedByCurrentUser: nextLiked,
        likesCount: Math.max(0, current.likesCount + (nextLiked ? 1 : -1))
      }));
    } catch (error) {
      if (isRecoverableSessionError(error)) {
        await recoverBrokenSession();
        return;
      }

      setCommunityStatus({
        tone: 'error',
        text: formatSocialError(error, 'Unable to update likes right now.')
      });
    } finally {
      setCommunityActionLoadingKey(null);
    }
  }

  async function handleCommunityCommentFavoriteToggle(postId: string, comment: CommunityComment) {
    if (!client || !currentUser.id) return;

    const actionKey = `favorite-comment:${comment.id}`;
    const nextFavorite = !comment.favoritedByCurrentUser;
    setCommunityActionLoadingKey(actionKey);
    setCommunityStatus(null);

    try {
      await setCommunityCommentFavorite(client, comment.id, currentUser.id, nextFavorite);
      updateCommunityComment(postId, comment.id, (current) => ({ ...current, favoritedByCurrentUser: nextFavorite }));
      setCommunityStatus({ tone: 'success', text: nextFavorite ? 'Comment added to Favorite Comments.' : 'Comment removed from Favorite Comments.' });
    } catch (error) {
      if (isRecoverableSessionError(error)) {
        await recoverBrokenSession();
        return;
      }

      setCommunityStatus({
        tone: 'error',
        text: formatSocialError(error, 'Unable to update comment favorites right now.')
      });
    } finally {
      setCommunityActionLoadingKey(null);
    }
  }

  async function handleCommunityCommentLikeToggle(postId: string, comment: CommunityComment) {
    if (!client || !currentUser.id) return;

    const actionKey = `like-comment:${comment.id}`;
    const nextLiked = !comment.likedByCurrentUser;
    setCommunityActionLoadingKey(actionKey);
    setCommunityStatus(null);

    try {
      await setCommunityCommentLike(client, comment.id, currentUser.id, nextLiked);
      updateCommunityComment(postId, comment.id, (current) => ({
        ...current,
        likedByCurrentUser: nextLiked,
        likesCount: Math.max(0, current.likesCount + (nextLiked ? 1 : -1))
      }));
    } catch (error) {
      if (isRecoverableSessionError(error)) {
        await recoverBrokenSession();
        return;
      }

      setCommunityStatus({
        tone: 'error',
        text: formatSocialError(error, 'Unable to update comment likes right now.')
      });
    } finally {
      setCommunityActionLoadingKey(null);
    }
  }

  async function handleFriendSearch() {
    if (!client || !currentUser.id) return;

    if (friendSearchQuery.trim().length < 2) {
      setFriendSearchStatus({ tone: 'info', text: 'Enter at least 2 characters to search by name or email.' });
      setFriendSearchResults([]);
      return;
    }

    setFriendSearchLoading(true);
    setFriendSearchStatus(null);

    try {
      const results = await searchDirectoryProfiles(client, friendSearchQuery, currentUser.id, friendIds);
      setFriendSearchResults(results);
      setFriendSearchStatus({
        tone: 'info',
        text: results.length ? `Found ${results.length} matching profile${results.length === 1 ? '' : 's'}.` : 'No matching profiles found.'
      });
    } catch (error) {
      if (isRecoverableSessionError(error)) {
        await recoverBrokenSession();
        return;
      }

      setFriendSearchStatus({
        tone: 'error',
        text: formatSocialError(error, 'Unable to search for friends right now.')
      });
    } finally {
      setFriendSearchLoading(false);
    }
  }

  async function handleAddFriend(profile: FriendSearchResult) {
    if (!client || !currentUser.id) return;

    const actionKey = `add-friend:${profile.userId}`;
    setFriendActionLoadingKey(actionKey);
    setFriendsStatus(null);

    try {
      await addFriend(client, currentUser.id, profile.userId);
      await loadFriends(true);
      setFriendSearchResults((current) => current.map((item) => (
        item.userId === profile.userId ? { ...item, isAlreadyFriend: true } : item
      )));
      setSelectedFriendProfile((current) => current && current.userId === profile.userId
        ? { ...current, isAlreadyFriend: true }
        : current);
      setFriendsStatus({ tone: 'success', text: `${profile.name} was added to your friends list.` });
    } catch (error) {
      if (isRecoverableSessionError(error)) {
        await recoverBrokenSession();
        return;
      }

      setFriendsStatus({
        tone: 'error',
        text: formatSocialError(error, 'Unable to add this friend right now.')
      });
    } finally {
      setFriendActionLoadingKey(null);
    }
  }

  async function handleRemoveFriends(friendshipIds: string[], label = 'Selected friends removed.') {
    if (!client || !friendshipIds.length) return;

    const actionKey = `remove-friends:${friendshipIds.join(',')}`;
    setFriendActionLoadingKey(actionKey);
    setFriendsStatus(null);

    try {
      await removeFriendships(client, friendshipIds);
      const removedFriendIds = friends.filter((friend) => friendshipIds.includes(friend.friendshipId)).map((friend) => friend.userId);

      setFriends((current) => current.filter((friend) => !friendshipIds.includes(friend.friendshipId)));
      setSelectedFriendshipIds((current) => current.filter((id) => !friendshipIds.includes(id)));
      setFriendSearchResults((current) => current.map((result) => (
        removedFriendIds.includes(result.userId) ? { ...result, isAlreadyFriend: false } : result
      )));
      setSelectedFriendProfile((current) => current && removedFriendIds.includes(current.userId)
        ? { ...current, isAlreadyFriend: false }
        : current);
      setFriendsStatus({ tone: 'success', text: label });
    } catch (error) {
      if (isRecoverableSessionError(error)) {
        await recoverBrokenSession();
        return;
      }

      setFriendsStatus({
        tone: 'error',
        text: formatSocialError(error, 'Unable to remove friends right now.')
      });
    } finally {
      setFriendActionLoadingKey(null);
    }
  }

  async function handleLogin() {
    if (!validateLogin() || !client) return;
    setLoginLoading(true);
    setLoginStatus(null);

    try {
      const { error } = await client.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword.trim()
      });

      if (error) throw error;
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
          data: { full_name: signupName.trim(), avatar_url: '' },
          emailRedirectTo: siteUrl
        }
      });

      if (error) throw error;

      if (!data.session?.user) {
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
    const trimmedAvatarUrl = profileAvatarUrl.trim();
    const nextPassword = profilePassword.trim();
    const updates: {
      email?: string;
      password?: string;
      data?: { full_name: string; avatar_url: string | null };
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

    if (trimmedName !== currentUser.name || trimmedAvatarUrl !== currentUser.avatarUrl) {
      updates.data = { full_name: trimmedName, avatar_url: trimmedAvatarUrl || null };
    }
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

      let nextUser: UserProfile = {
        ...currentUser,
        name: updates.data?.full_name || currentUser.name,
        email: updates.email || currentUser.email,
        avatarUrl: updates.data?.avatar_url || ''
      };

      try {
        nextUser = await syncUserDirectoryProfile(client, nextUser);
      } catch {
        // Keep auth changes even if the directory table has not been set up yet.
      }

      setCurrentUser(nextUser);
      setCommunityPosts((current) => updateCommunityAuthorSnapshots(current, nextUser));
      setProfileName(nextUser.name);
      setProfileEmail(nextUser.email);
      setProfileAvatarUrl(nextUser.avatarUrl);
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
    let repeatRuleId = '';

    try {
      const { data: userData, error: userError } = await client.auth.getUser();
      if (userError) throw userError;

      const userId = userData.user?.id || currentUser.id;
      if (!userId) {
        throw new Error('You are no longer signed in. Please log in again and retry.');
      }

      const repeatRulePayload = buildRepeatRulePayload();

      if (repeatRulePayload) {
        repeatRuleId = await insertAssignmentRepeatRule(client, repeatRulePayload, userId);
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
          status: 'active',
          repeatEnabled: addForm.repeatEnabled,
          repeatEvery: addForm.repeatEvery,
          repeatTime: addForm.repeatTime,
          repeatDaysOfWeek: addForm.repeatDaysOfWeek,
          repeatDaysOfMonth: addForm.repeatDaysOfMonth,
          repeatTimezone: addForm.repeatTimezone,
          repeatRuleId
        },
        userId
      );

      setAssignments((current) => [...current, saved]);
      setAddModalOpen(false);
      setAddForm(createEmptyAssignmentForm());
      setAddFormErrors({});
    } catch (error) {
      if (repeatRuleId) {
        try {
          await deleteAssignmentRepeatRule(client, repeatRuleId);
        } catch {
          // Keep the original error as the main failure path.
        }
      }

      if (isRecoverableSessionError(error)) {
        await recoverBrokenSession();
        return;
      }

      const message = formatAssignmentError(error, 'Could not save assignment.');
      setLoginStatus({ tone: 'error', text: `Could not save assignment: ${message}` });
    } finally {
      setAddLoading(false);
    }
  }

  async function moveSelectedAssignments(fromStatus: 'active' | 'finished', nextStatus: 'finished' | 'trashed') {
    if (!client || !selectedIds.length) return;

    try {
      const { data: userData, error: userError } = await client.auth.getUser();
      if (userError) throw userError;
      const userId = userData.user?.id || currentUser.id;
      if (!userId) {
        throw new Error('You are no longer signed in. Please log in again and retry.');
      }

      await updateAssignmentStatuses(client, userId, selectedIds, nextStatus);

      const sourceAssignments = fromStatus === 'active' ? assignments : finished;
      const moving = sourceAssignments
        .filter((item) => selectedIds.includes(item.id))
        .map((item) => ({ ...item, status: nextStatus }));

      if (fromStatus === 'active') {
        setAssignments((current) => current.filter((item) => !selectedIds.includes(item.id)));
      } else {
        setFinished((current) => current.filter((item) => !selectedIds.includes(item.id)));
      }

      if (nextStatus === 'finished') {
        setFinished((current) => [...current, ...moving]);
      }

      if (nextStatus === 'trashed') {
        setTrash((current) => [...current, ...moving]);
      }

      if (selectedAssignment && selectedIds.includes(selectedAssignment.id)) {
        setSelectedAssignment(null);
      }

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

  async function deleteSelectedAssignments() {
    if (!client || !selectedIds.length) return;

    try {
      const { data: userData, error: userError } = await client.auth.getUser();
      if (userError) throw userError;

      const userId = userData.user?.id || currentUser.id;
      if (!userId) {
        throw new Error('You are no longer signed in. Please log in again and retry.');
      }

      await deleteAssignments(client, userId, selectedIds);
      setTrash((current) => current.filter((item) => !selectedIds.includes(item.id)));

      if (selectedAssignment && selectedIds.includes(selectedAssignment.id)) {
        setSelectedAssignment(null);
      }

      setSelectedIds([]);
    } catch (error) {
      if (isRecoverableSessionError(error)) {
        await recoverBrokenSession();
        return;
      }

      const message = getErrorMessage(error, 'Action failed.');
      setLoginStatus({ tone: 'error', text: `Could not delete assignments: ${message}` });
    }
  }

  async function handleLogout() {
    if (!client) {
      resetAppState();
      return;
    }

    setLogoutLoading(true);

    try {
      const { error } = await client.auth.signOut();
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
    setSelectedIds(checked ? selectableAssignments.map((item) => item.id) : []);
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
            gradingMode={gradingMode}
            priorities={assignmentPriorityState.priorities}
            onGradingModeChange={setGradingMode}
            selectedIds={selectedIds}
            onToggleSelected={handleToggleSelected}
            onToggleSelectAll={handleToggleSelectAll}
            onOpenAddModal={() => { setAddForm(createEmptyAssignmentForm()); setAddFormErrors({}); setAddModalOpen(true); }}
            onOpenDetails={setSelectedAssignment}
            onBulkFinish={() => void moveSelectedAssignments('active', 'finished')}
            onBulkDelete={() => void moveSelectedAssignments('active', 'trashed')}
          />
        );
      case 'community':
        return (
          <CommunityView
            currentUserId={currentUser.id}
            posts={visibleCommunityPosts}
            activeSection={communitySection}
            loading={communityLoading}
            status={communityStatus}
            postValues={communityPostValues}
            postErrors={communityPostErrors}
            posting={communityPosting}
            commentDrafts={communityCommentDrafts}
            commentErrors={communityCommentErrors}
            commentSorts={communityCommentSorts}
            commentLoadingId={communityCommentLoadingId}
            actionLoadingKey={communityActionLoadingKey}
            onSectionChange={setCommunitySection}
            onCommentSortChange={(postId, sort) => setCommunityCommentSorts((current) => ({ ...current, [postId]: sort }))}
            onPostChange={(field, value) => {
              setCommunityPostValues((current) => ({ ...current, [field]: value }));
              setCommunityPostErrors((current) => ({ ...current, [field]: undefined }));
            }}
            onPostSubmit={() => void handleCommunityPost()}
            onCommentChange={(postId, value) => {
              setCommunityCommentDrafts((current) => ({ ...current, [postId]: value }));
              setCommunityCommentErrors((current) => ({ ...current, [postId]: undefined }));
            }}
            onCommentSubmit={(postId) => void handleCommunityComment(postId)}
            onDeletePost={(post) => void handleCommunityDelete(post)}
            onToggleHidePost={(post) => void handleCommunityPostHiddenToggle(post)}
            onTogglePinPost={(post) => void handleCommunityPostPinnedToggle(post)}
            onToggleFavoritePost={(post) => void handleCommunityPostFavoriteToggle(post)}
            onToggleLikePost={(post) => void handleCommunityPostLikeToggle(post)}
            onToggleFavoriteComment={(postId, comment) => void handleCommunityCommentFavoriteToggle(postId, comment)}
            onToggleLikeComment={(postId, comment) => void handleCommunityCommentLikeToggle(postId, comment)}
            onRefresh={() => void loadCommunity(true)}
          />
        );
      case 'friends':
        return (
          <FriendsView
            friends={friends}
            loading={friendsLoading}
            status={friendsStatus}
            searchQuery={friendSearchQuery}
            searchResults={friendSearchResults}
            searchLoading={friendSearchLoading}
            searchStatus={friendSearchStatus}
            selectedFriendshipIds={selectedFriendshipIds}
            activeProfile={selectedFriendProfile}
            actionLoadingKey={friendActionLoadingKey}
            onSearchQueryChange={setFriendSearchQuery}
            onSearch={() => void handleFriendSearch()}
            onSelectSearchResult={setSelectedFriendProfile}
            onCloseProfile={() => setSelectedFriendProfile(null)}
            onAddFriend={(profile) => void handleAddFriend(profile)}
            onToggleFriendSelection={(friendshipId, checked) => {
              setSelectedFriendshipIds((current) => checked
                ? [...current, friendshipId]
                : current.filter((id) => id !== friendshipId));
            }}
            onRemoveFriend={(friend) => void handleRemoveFriends([friend.friendshipId], `${friend.name} removed from your friends list.`)}
            onRemoveSelectedFriends={() => void handleRemoveFriends(selectedFriendshipIds)}
          />
        );
      case 'finished':
        return (
          <SimpleTableView
            id="finished-table"
            title="Finished"
            subtitle="Assignments you have marked as complete."
            accentClass="green-soft"
            assignments={finished}
            showDifficulty
            emptyMessage="No finished assignments yet."
            selectedIds={selectedIds}
            onToggleSelected={handleToggleSelected}
            onToggleSelectAll={handleToggleSelectAll}
            onBulkDelete={() => void moveSelectedAssignments('finished', 'trashed')}
            deleteLabel="Delete"
          />
        );
      case 'trash':
        return (
          <SimpleTableView
            id="trash-table"
            title="Trash"
            subtitle="Deleted assignments. They are archived here."
            accentClass="red-soft"
            assignments={trash}
            emptyMessage="Trash is empty."
            selectedIds={selectedIds}
            onToggleSelected={handleToggleSelected}
            onToggleSelectAll={handleToggleSelectAll}
            onBulkDelete={() => void deleteSelectedAssignments()}
            deleteLabel="Delete Forever"
          />
        );
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
            profileAvatarUrl={profileAvatarUrl}
            profilePassword={profilePassword}
            profileConfirmPassword={profileConfirmPassword}
            loading={profileLoading}
            status={profileStatus}
            onNameChange={setProfileName}
            onEmailChange={setProfileEmail}
            onAvatarUrlChange={setProfileAvatarUrl}
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
        onChange={handleAddFormChange}
        onSubmit={() => void handleAddAssignment()}
      />
      <AssignmentDetailModal
        assignment={selectedAssignment}
        priority={selectedAssignment ? assignmentPriorityState.priorities[selectedAssignment.id] ?? null : null}
        onClose={() => setSelectedAssignment(null)}
      />
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
