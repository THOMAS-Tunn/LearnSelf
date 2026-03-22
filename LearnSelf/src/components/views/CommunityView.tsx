import { useEffect, useRef, useState } from 'react';
import { COMMUNITY_COMMENT_SORT_OPTIONS, COMMUNITY_SECTIONS } from '../../constants';
import {
  canDeleteCommunityPost,
  getCommunityRelativeTime,
  getDeleteHelpText
} from '../../lib/community';
import { InfoTip } from '../common/InfoTip';
import { UserAvatar } from '../common/UserAvatar';
import type {
  CommunityComment,
  CommunityCommentSort,
  CommunityFeedSection,
  CommunityPost,
  CommunityPostFormValues,
  StatusMessage
} from '../../types';

interface CommunityViewProps {
  currentUserId: string;
  posts: CommunityPost[];
  activeSection: CommunityFeedSection;
  loading: boolean;
  status: StatusMessage | null;
  postValues: CommunityPostFormValues;
  postErrors: Partial<Record<keyof CommunityPostFormValues, string>>;
  posting: boolean;
  commentDrafts: Record<string, string>;
  commentErrors: Record<string, string | undefined>;
  commentSorts: Record<string, CommunityCommentSort>;
  commentLoadingId: string | null;
  actionLoadingKey: string | null;
  onSectionChange: (section: CommunityFeedSection) => void;
  onCommentSortChange: (postId: string, sort: CommunityCommentSort) => void;
  onPostChange: (field: keyof CommunityPostFormValues, value: string) => void;
  onPostSubmit: () => void;
  onCommentChange: (postId: string, value: string) => void;
  onCommentSubmit: (postId: string) => void;
  onDeletePost: (post: CommunityPost) => void;
  onToggleHidePost: (post: CommunityPost) => void;
  onTogglePinPost: (post: CommunityPost) => void;
  onToggleFavoritePost: (post: CommunityPost) => void;
  onToggleLikePost: (post: CommunityPost) => void;
  onToggleFavoriteComment: (postId: string, comment: CommunityComment) => void;
  onToggleLikeComment: (postId: string, comment: CommunityComment) => void;
  onRefresh: () => void;
}

function sortComments(comments: CommunityComment[], sort: CommunityCommentSort) {
  return [...comments].sort((left, right) => {
    if (sort === 'oldest') {
      return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    }

    if (sort === 'newest') {
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    }

    return (
      right.likesCount - left.likesCount
      || new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
  });
}

function ThumbUpIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      {filled ? (
        <path
          d="M6.5 7L8.2 3.6C8.5 3 9.2 2.8 9.8 3C10.4 3.2 10.8 3.8 10.7 4.4L10.2 7H12.4C13.5 7 14.3 8 14 9L13.2 12.3C13 13.1 12.3 13.7 11.5 13.7H6.5V7ZM2.3 7H5.4V13.7H2.3C1.9 13.7 1.5 13.4 1.5 12.9V7.8C1.5 7.4 1.9 7 2.3 7Z"
          fill="currentColor"
        />
      ) : (
        <>
          <path
            d="M6.5 7L8.2 3.6C8.5 3 9.2 2.8 9.8 3C10.4 3.2 10.8 3.8 10.7 4.4L10.2 7H12.4C13.5 7 14.3 8 14 9L13.2 12.3C13 13.1 12.3 13.7 11.5 13.7H6.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M2.3 7H5.4V13.7H2.3C1.9 13.7 1.5 13.4 1.5 12.9V7.8C1.5 7.4 1.9 7 2.3 7Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
}

function StarIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      {filled ? (
        <path
          d="M8 2.1L9.6 5.4L13.3 5.9L10.6 8.4L11.2 12L8 10.3L4.8 12L5.4 8.4L2.7 5.9L6.4 5.4L8 2.1Z"
          fill="currentColor"
        />
      ) : (
        <path
          d="M8 2.1L9.6 5.4L13.3 5.9L10.6 8.4L11.2 12L8 10.3L4.8 12L5.4 8.4L2.7 5.9L6.4 5.4L8 2.1Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

function PinIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      {filled ? (
        <>
          <path
            d="M10.8 2.6L13.4 5.2L11.6 6.1L9.9 9.1L6.9 10.8L6 12.6L3.4 10L5.2 9.1L6.9 6.1L9.9 4.4L10.8 2.6Z"
            fill="currentColor"
          />
          <path d="M6 12.6L4.1 14.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path
            d="M10.8 2.6L13.4 5.2L11.6 6.1L9.9 9.1L6.9 10.8L6 12.6L3.4 10L5.2 9.1L6.9 6.1L9.9 4.4L10.8 2.6Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M6 12.6L4.1 14.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="12" height="3" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M3.4 6.1V11.9C3.4 12.7 4 13.3 4.8 13.3H11.2C12 13.3 12.6 12.7 12.6 11.9V6.1"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path d="M6 8.6H10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3.5 4.2H12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M6.2 2.8H9.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path
        d="M4.6 4.2L5.1 12.1C5.2 12.8 5.7 13.3 6.4 13.3H9.6C10.3 13.3 10.8 12.8 10.9 12.1L11.4 4.2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M6.7 6.6V10.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M9.3 6.6V10.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path
        d="M13 7.5C13 10.5 10.5 13 7.5 13C4.5 13 2 10.5 2 7.5C2 4.5 4.5 2 7.5 2C9.2 2 10.7 2.8 11.7 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M11.5 2L13.5 4L11.5 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="3.5" r="1.2" fill="currentColor" />
      <circle cx="8" cy="8" r="1.2" fill="currentColor" />
      <circle cx="8" cy="12.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M13.5 2.5L7 9M13.5 2.5L9 13.5L7 9M13.5 2.5L2.5 6.5L7 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LikeButton({
  liked,
  count,
  loading,
  onToggle,
  ariaLabel
}: {
  liked: boolean;
  count: number;
  loading: boolean;
  onToggle: () => void;
  ariaLabel: string;
}) {
  const [burst, setBurst] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
  }, []);

  function handleClick() {
    if (!liked) {
      setBurst(true);
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        setBurst(false);
        timeoutRef.current = null;
      }, 500);
    }

    onToggle();
  }

  return (
    <span className="community-action-group">
      <button
        className={`community-icon-btn ${liked ? 'is-liked' : ''} ${burst ? 'like-burst' : ''}`}
        type="button"
        aria-label={ariaLabel}
        onClick={handleClick}
        disabled={loading}
      >
        <ThumbUpIcon filled={liked} />
      </button>
      {count > 0 && <span className="community-action-count">{count}</span>}
    </span>
  );
}

function FavoriteButton({
  favorited,
  loading,
  onToggle,
  ariaLabel
}: {
  favorited: boolean;
  loading: boolean;
  onToggle: () => void;
  ariaLabel: string;
}) {
  const [pop, setPop] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
  }, []);

  function handleClick() {
    setPop(true);
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setPop(false);
      timeoutRef.current = null;
    }, 400);
    onToggle();
  }

  return (
    <button
      className={`community-icon-btn ${favorited ? 'is-starred' : ''} ${pop ? 'star-pop' : ''}`}
      type="button"
      aria-label={ariaLabel}
      onClick={handleClick}
      disabled={loading}
    >
      <StarIcon filled={favorited} />
    </button>
  );
}

function ComposeDrawer({
  open,
  onClose,
  postValues,
  postErrors,
  posting,
  status,
  onPostChange,
  onPostSubmit
}: {
  open: boolean;
  onClose: () => void;
  postValues: CommunityPostFormValues;
  postErrors: Partial<Record<keyof CommunityPostFormValues, string>>;
  posting: boolean;
  status: StatusMessage | null;
  onPostChange: (field: keyof CommunityPostFormValues, value: string) => void;
  onPostSubmit: () => void;
}) {
  const titleLen = postValues.title.length;
  const bodyLen = postValues.body.length;

  return (
    <>
      <div
        className={`compose-backdrop ${open ? 'compose-backdrop--in' : 'compose-backdrop--out'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`compose-drawer ${open ? 'compose-drawer--in' : 'compose-drawer--out'}`}
        role="dialog"
        aria-modal="true"
        aria-label="Create post"
      >
        <div className="compose-drawer-handle" />

        <div className="compose-drawer-head">
          <div className="compose-drawer-heading">
            <PlusIcon />
            <span>New Post</span>
          </div>
          <button className="cd-close-btn" type="button" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        {status?.text ? (
          <div className={`status-banner ${status.tone}`} style={{ marginBottom: 16 }}>
            {status.text}
          </div>
        ) : null}

        <div className="compose-form">
          <div className="compose-field">
            <div className="compose-label-row">
              <label className="modal-label" htmlFor="m-community-title">Title</label>
              <span className={`compose-char-count ${titleLen > 110 ? 'warn' : ''}`}>
                {titleLen}/120
              </span>
            </div>
            <input
              id="m-community-title"
              className="modal-input"
              type="text"
              maxLength={120}
              placeholder="What do you need help with?"
              value={postValues.title}
              onChange={(event) => onPostChange('title', event.target.value)}
            />
            {postErrors.title ? <div className="field-error">{postErrors.title}</div> : null}
          </div>

          <div className="compose-field">
            <div className="compose-label-row">
              <label className="modal-label" htmlFor="m-community-body">Details</label>
              <span className={`compose-char-count ${bodyLen > 3800 ? 'warn' : ''}`}>
                {bodyLen}/4000
              </span>
            </div>
            <textarea
              id="m-community-body"
              className="modal-textarea community-post-textarea"
              rows={5}
              maxLength={4000}
              placeholder="Explain what you're stuck on..."
              value={postValues.body}
              onChange={(event) => onPostChange('body', event.target.value)}
            />
            {postErrors.body ? <div className="field-error">{postErrors.body}</div> : null}
          </div>

          <button
            className={`compose-submit-btn ${posting ? 'btn-loading' : ''}`}
            type="button"
            onClick={onPostSubmit}
            disabled={posting}
          >
            <SendIcon />
            <span>{posting ? 'Posting...' : 'Post'}</span>
          </button>
        </div>
      </div>
    </>
  );
}

export function CommunityView(props: CommunityViewProps) {
  const closeDrawerTimeoutRef = useRef<number | null>(null);
  const prevPostingRef = useRef(props.posting);
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [drawerAnimating, setDrawerAnimating] = useState(false);

  useEffect(() => () => {
    if (closeDrawerTimeoutRef.current) {
      window.clearTimeout(closeDrawerTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (
      prevPostingRef.current
      && !props.posting
      && !props.postValues.title
      && !props.postValues.body
      && composeOpen
    ) {
      closeDrawer();
    }
    prevPostingRef.current = props.posting;
  }, [composeOpen, props.postValues.body, props.postValues.title, props.posting]);

  useEffect(() => {
    setOpenMenuPostId(null);
  }, [props.activeSection]);

  useEffect(() => {
    if (!openMenuPostId) {
      return;
    }

    function handle(event: MouseEvent) {
      const target = event.target as Element;
      if (!target.closest('.community-post-menu-wrap')) {
        setOpenMenuPostId(null);
      }
    }

    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [openMenuPostId]);

  function openDrawer() {
    if (closeDrawerTimeoutRef.current) {
      window.clearTimeout(closeDrawerTimeoutRef.current);
      closeDrawerTimeoutRef.current = null;
    }
    setDrawerAnimating(true);
    setComposeOpen(true);
  }

  function closeDrawer() {
    if (closeDrawerTimeoutRef.current) {
      window.clearTimeout(closeDrawerTimeoutRef.current);
      closeDrawerTimeoutRef.current = null;
    }
    setComposeOpen(false);
    closeDrawerTimeoutRef.current = window.setTimeout(() => {
      setDrawerAnimating(false);
      closeDrawerTimeoutRef.current = null;
    }, 340);
  }

  const titleLen = props.postValues.title.length;
  const bodyLen = props.postValues.body.length;

  return (
    <div className="view active" id="view-community">
      <button
        className="community-fab"
        type="button"
        aria-label="Create a new post"
        onClick={openDrawer}
      >
        <PlusIcon />
      </button>

      {(composeOpen || drawerAnimating) ? (
        <ComposeDrawer
          open={composeOpen}
          onClose={closeDrawer}
          postValues={props.postValues}
          postErrors={props.postErrors}
          posting={props.posting}
          status={props.status}
          onPostChange={props.onPostChange}
          onPostSubmit={props.onPostSubmit}
        />
      ) : null}

      <div className="community-layout">
        <aside className="community-sidebar">
          <div className="community-sidebar-head">
            <div className="view-title" style={{ fontSize: 18, marginBottom: 0 }}>Community</div>
            <InfoTip text="Filter posts by category. Pinned posts float to the top." placement="right" />
          </div>
          <div className="view-sub" style={{ marginBottom: 14, marginTop: 4, fontSize: 12.5 }}>
            Your feed, filtered your way.
          </div>

          <div className="community-section-list">
            {COMMUNITY_SECTIONS.map((section) => (
              <button
                key={section.key}
                className={`community-section-btn ${props.activeSection === section.key ? 'active' : ''}`}
                type="button"
                onClick={() => props.onSectionChange(section.key)}
              >
                {section.label}
              </button>
            ))}
          </div>

          <button
            className="community-refresh-btn"
            type="button"
            onClick={props.onRefresh}
            disabled={props.loading}
            aria-label="Refresh feed"
            title="Refresh feed"
            style={{ marginTop: 18 }}
          >
            <RefreshIcon />
          </button>
        </aside>

        <section className="community-feed-column">
          {props.loading && !props.posts.length ? (
            <div className="community-empty-card">
              <div className="community-empty-title">Loading posts...</div>
              <div className="community-empty-copy">Pulling the latest activity.</div>
            </div>
          ) : null}

          {!props.loading && !props.posts.length ? (
            <div className="community-empty-card">
              <div className="community-empty-title">Nothing here yet</div>
              <div className="community-empty-copy">Try a different section or be the first to post.</div>
            </div>
          ) : null}

          {props.posts.map((post) => {
            const isOwner = post.userId === props.currentUserId;
            const canDelete = isOwner && post.status === 'open' && canDeleteCommunityPost(post);
            const currentSort = props.commentSorts[post.id] || 'most-liked';
            const displayComments = props.activeSection === 'favorite-comments'
              ? post.comments.filter((comment) => comment.favoritedByCurrentUser)
              : post.comments;
            const sortedComments = sortComments(displayComments, currentSort);

            return (
              <article
                key={post.id}
                className={`community-post-card ${post.pinnedByCurrentUser ? 'is-pinned' : ''}`}
              >
                <div className="community-post-top">
                  <div className="community-post-author">
                    <UserAvatar name={post.authorName} avatarUrl={post.authorAvatarUrl} className="community-avatar" />
                    <div className="community-post-copy">
                      <div className="community-post-title">{post.title}</div>
                      <div className="community-post-meta" title={new Date(post.createdAt).toLocaleString()}>
                        <span className="community-post-meta-author">{post.authorName}</span>
                        <span className="community-post-meta-sep">.</span>
                        <span>{getCommunityRelativeTime(post.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="community-post-menu-wrap">
                    <button
                      className="community-menu-btn"
                      type="button"
                      aria-label="Post options"
                      onClick={() => setOpenMenuPostId((current) => (current === post.id ? null : post.id))}
                    >
                      <DotsIcon />
                    </button>

                    {openMenuPostId === post.id ? (
                      <div className="community-post-menu">
                        {isOwner && canDelete ? (
                          <button
                            type="button"
                            className="menu-item menu-item--danger"
                            onClick={() => { setOpenMenuPostId(null); props.onDeletePost(post); }}
                            disabled={props.actionLoadingKey === `delete-post:${post.id}`}
                          >
                            <TrashIcon />
                            <span>{props.actionLoadingKey === `delete-post:${post.id}` ? 'Deleting...' : 'Delete'}</span>
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="menu-item"
                          onClick={() => { setOpenMenuPostId(null); props.onToggleHidePost(post); }}
                          disabled={props.actionLoadingKey === `hide-post:${post.id}`}
                        >
                          <ArchiveIcon />
                          <span>{post.hiddenByCurrentUser ? 'Unarchive' : 'Archive'}</span>
                        </button>
                        <button
                          type="button"
                          className={`menu-item ${post.pinnedByCurrentUser ? 'is-active-item' : ''}`}
                          onClick={() => { setOpenMenuPostId(null); props.onTogglePinPost(post); }}
                          disabled={props.actionLoadingKey === `pin-post:${post.id}`}
                        >
                          <PinIcon filled={post.pinnedByCurrentUser} />
                          <span>{post.pinnedByCurrentUser ? 'Unpin' : 'Pin'}</span>
                        </button>
                        <button
                          type="button"
                          className={`menu-item ${post.favoritedByCurrentUser ? 'is-active-item' : ''}`}
                          onClick={() => { setOpenMenuPostId(null); props.onToggleFavoritePost(post); }}
                          disabled={props.actionLoadingKey === `favorite-post:${post.id}`}
                        >
                          <StarIcon filled={post.favoritedByCurrentUser} />
                          <span>{post.favoritedByCurrentUser ? 'Unfavorite' : 'Favorite'}</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="community-post-body">{post.body}</div>

                {(post.pinnedByCurrentUser || post.favoritedByCurrentUser || post.hiddenByCurrentUser || post.status === 'deleted') ? (
                  <div className="community-post-tags">
                    {post.pinnedByCurrentUser && (
                      <span className="community-pill community-pill--pin"><PinIcon filled /> Pinned</span>
                    )}
                    {post.favoritedByCurrentUser && (
                      <span className="community-pill community-pill--star"><StarIcon filled /> Favorite</span>
                    )}
                    {post.hiddenByCurrentUser && <span className="community-pill">Archived</span>}
                    {post.status === 'deleted' && (
                      <span className="community-pill community-pill--danger">Deleted</span>
                    )}
                  </div>
                ) : null}

                {isOwner ? (
                  <div className="community-owner-note">{getDeleteHelpText(post)}</div>
                ) : null}

                <div className="community-post-actions">
                  <LikeButton
                    liked={post.likedByCurrentUser}
                    count={post.likesCount}
                    loading={props.actionLoadingKey === `like-post:${post.id}`}
                    onToggle={() => props.onToggleLikePost(post)}
                    ariaLabel={post.likedByCurrentUser ? 'Remove like' : 'Like post'}
                  />
                </div>

                <div className="community-comments">
                  <div className="community-comments-head">
                    <div className="community-comments-title">
                      Comments
                      {displayComments.length > 0 && (
                        <span className="community-comments-count">{displayComments.length}</span>
                      )}
                      <InfoTip text="Sort by most liked, newest, or oldest." placement="top" />
                    </div>
                    <label className="community-comment-filter">
                      <select
                        value={currentSort}
                        onChange={(event) => props.onCommentSortChange(
                          post.id,
                          event.target.value as CommunityCommentSort
                        )}
                      >
                        {COMMUNITY_COMMENT_SORT_OPTIONS.map((option) => (
                          <option key={option.key} value={option.key}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="community-comment-list">
                    {sortedComments.length ? sortedComments.map((comment) => (
                      <div key={comment.id} className="community-comment">
                        <div className="community-comment-top">
                          <UserAvatar
                            name={comment.authorName}
                            avatarUrl={comment.authorAvatarUrl}
                            className="community-avatar community-avatar-small"
                          />
                          <div className="community-comment-meta">
                            <div className="community-comment-meta-top">
                              <span className="community-comment-author-name">{comment.authorName}</span>
                              {comment.userId === post.userId && (
                                <span className="community-author-badge">OP</span>
                              )}
                              <span className="community-comment-time" title={new Date(comment.createdAt).toLocaleString()}>
                                {getCommunityRelativeTime(comment.createdAt)}
                              </span>
                            </div>
                            <div className="community-comment-body">{comment.body}</div>
                            <div className="community-comment-actions">
                              <LikeButton
                                liked={comment.likedByCurrentUser}
                                count={comment.likesCount}
                                loading={props.actionLoadingKey === `like-comment:${comment.id}`}
                                onToggle={() => props.onToggleLikeComment(post.id, comment)}
                                ariaLabel={comment.likedByCurrentUser ? 'Remove like' : 'Like comment'}
                              />
                              <FavoriteButton
                                favorited={comment.favoritedByCurrentUser}
                                loading={props.actionLoadingKey === `favorite-comment:${comment.id}`}
                                onToggle={() => props.onToggleFavoriteComment(post.id, comment)}
                                ariaLabel={comment.favoritedByCurrentUser ? 'Unfavorite comment' : 'Favorite comment'}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="community-comment-empty">
                        {props.activeSection === 'favorite-comments'
                          ? 'No favorited comments on this post.'
                          : 'No comments yet. Be the first to help!'}
                      </div>
                    )}
                  </div>

                  {post.status === 'open' ? (
                    <div className="community-comment-form">
                      <textarea
                        className="modal-textarea community-comment-textarea"
                        rows={2}
                        maxLength={2000}
                        placeholder="Add a comment..."
                        value={props.commentDrafts[post.id] || ''}
                        onChange={(event) => props.onCommentChange(post.id, event.target.value)}
                      />
                      {props.commentErrors[post.id] ? (
                        <div className="field-error">{props.commentErrors[post.id]}</div>
                      ) : null}
                      <div className="community-comment-actions-row">
                        <button
                          className="community-submit-btn community-submit-btn-small"
                          type="button"
                          onClick={() => props.onCommentSubmit(post.id)}
                          disabled={props.commentLoadingId === post.id}
                        >
                          <SendIcon />
                          <span>{props.commentLoadingId === post.id ? 'Posting...' : 'Reply'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="community-owner-note" style={{ marginTop: 12 }}>
                      Deleted posts are read-only.
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </section>

        <aside className="community-compose-card">
          {props.status?.text ? (
            <div className={`status-banner ${props.status.tone}`} style={{ marginBottom: 18 }}>
              {props.status.text}
            </div>
          ) : null}

          <div className="community-compose-top">
            <div className="view-title" style={{ fontSize: 17, marginBottom: 0 }}>New Post</div>
            <button
              className="community-refresh-btn"
              type="button"
              onClick={props.onRefresh}
              disabled={props.loading}
              aria-label="Refresh feed"
              title="Refresh feed"
            >
              <RefreshIcon />
            </button>
          </div>
          <div className="view-sub" style={{ marginBottom: 18, fontSize: 12.5, marginTop: 4 }}>
            Share what you need help with.
          </div>

          <div className="compose-form">
            <div className="compose-field">
              <div className="compose-label-row">
                <label className="modal-label" htmlFor="community-title">
                  Title
                  <InfoTip text="3-120 characters." placement="top" />
                </label>
                <span className={`compose-char-count ${titleLen > 110 ? 'warn' : ''}`}>{titleLen}/120</span>
              </div>
              <input
                id="community-title"
                className="modal-input"
                type="text"
                maxLength={120}
                placeholder="Need help with algebra homework"
                value={props.postValues.title}
                onChange={(event) => props.onPostChange('title', event.target.value)}
              />
              {props.postErrors.title ? (
                <div className="field-error">{props.postErrors.title}</div>
              ) : null}
            </div>

            <div className="compose-field">
              <div className="compose-label-row">
                <label className="modal-label" htmlFor="community-body">Details</label>
                <span className={`compose-char-count ${bodyLen > 3800 ? 'warn' : ''}`}>{bodyLen}/4000</span>
              </div>
              <textarea
                id="community-body"
                className="modal-textarea community-post-textarea"
                rows={6}
                maxLength={4000}
                placeholder="Explain where you're stuck..."
                value={props.postValues.body}
                onChange={(event) => props.onPostChange('body', event.target.value)}
              />
              {props.postErrors.body ? <div className="field-error">{props.postErrors.body}</div> : null}
            </div>

            <button
              className={`compose-submit-btn ${props.posting ? 'btn-loading' : ''}`}
              type="button"
              onClick={props.onPostSubmit}
              disabled={props.posting}
            >
              <SendIcon />
              <span>{props.posting ? 'Posting...' : 'Post'}</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
