import { useState, type ReactNode } from 'react';
import { COMMUNITY_COMMENT_SORT_OPTIONS, COMMUNITY_SECTIONS } from '../../constants';
import { canDeleteCommunityPost, getCommunityRelativeTime, getDeleteHelpText } from '../../lib/community';
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

    return right.likesCount - left.likesCount || new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

function ThumbUpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6.5 7L8.2 3.6C8.5 3 9.2 2.8 9.8 3C10.4 3.2 10.8 3.8 10.7 4.4L10.2 7H12.4C13.5 7 14.3 8 14 9L13.2 12.3C13 13.1 12.3 13.7 11.5 13.7H6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.3 7H5.4V13.7H2.3C1.9 13.7 1.5 13.4 1.5 12.9V7.8C1.5 7.4 1.9 7 2.3 7Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2.1L9.6 5.4L13.3 5.9L10.6 8.4L11.2 12L8 10.3L4.8 12L5.4 8.4L2.7 5.9L6.4 5.4L8 2.1Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M10.8 2.6L13.4 5.2L11.6 6.1L9.9 9.1L6.9 10.8L6 12.6L3.4 10L5.2 9.1L6.9 6.1L9.9 4.4L10.8 2.6Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M6 12.6L4.1 14.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="12" height="3" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3.4 6.1V11.9C3.4 12.7 4 13.3 4.8 13.3H11.2C12 13.3 12.6 12.7 12.6 11.9V6.1" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6 8.6H10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3.5 4.2H12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M6.2 2.8H9.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M4.6 4.2L5.1 12.1C5.2 12.8 5.7 13.3 6.4 13.3H9.6C10.3 13.3 10.8 12.8 10.9 12.1L11.4 4.2" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M6.7 6.6V10.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M9.3 6.6V10.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function MenuItemLabel({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="community-menu-item-label">
      <span className="community-menu-item-icon">{icon}</span>
      <span>{label}</span>
    </span>
  );
}

export function CommunityView(props: CommunityViewProps) {
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);

  return (
    <div className="view active" id="view-community">
      <div className="community-layout">
        {/* Left rail: keep secondary community sections here so posts stay centered for future styling work. */}
        <aside className="community-sidebar">
          <div className="view-title">Community</div>
          <div className="view-sub">Switch between your feed, favorites, archived items, and deleted posts.</div>

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
        </aside>

        {/* Center column: keep the post stack vertically in the middle of the page. */}
        <section className="community-feed-column">
          {props.loading && !props.posts.length ? (
            <div className="community-empty-card">
              <div className="community-empty-title">Loading posts...</div>
              <div className="community-empty-copy">Pulling the latest community activity.</div>
            </div>
          ) : null}

          {!props.loading && !props.posts.length ? (
            <div className="community-empty-card">
              <div className="community-empty-title">Nothing here yet</div>
              <div className="community-empty-copy">Try a different section or create the first post for this space.</div>
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
              <article key={post.id} className="community-post-card">
                <div className="community-post-top">
                  <div className="community-post-author">
                    <UserAvatar name={post.authorName} avatarUrl={post.authorAvatarUrl} className="community-avatar" />

                    <div className="community-post-copy">
                      <div className="community-post-title">{post.title}</div>
                      <div className="community-post-meta" title={new Date(post.createdAt).toLocaleString()}>
                        <span>{post.authorName}</span>
                        <span>{getCommunityRelativeTime(post.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="community-post-menu-wrap">
                    <button
                      className="community-menu-btn"
                      type="button"
                      onClick={() => setOpenMenuPostId((current) => current === post.id ? null : post.id)}
                    >
                      ...
                    </button>

                    {openMenuPostId === post.id ? (
                      <div className="community-post-menu">
                        {isOwner && canDelete ? (
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuPostId(null);
                              props.onDeletePost(post);
                            }}
                            disabled={props.actionLoadingKey === `delete-post:${post.id}`}
                          >
                            <MenuItemLabel icon={<TrashIcon />} label={props.actionLoadingKey === `delete-post:${post.id}` ? 'Deleting...' : 'Delete'} />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuPostId(null);
                            props.onToggleHidePost(post);
                          }}
                          disabled={props.actionLoadingKey === `hide-post:${post.id}`}
                        >
                          <MenuItemLabel icon={<ArchiveIcon />} label={post.hiddenByCurrentUser ? 'Unarchive' : 'Hide'} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuPostId(null);
                            props.onTogglePinPost(post);
                          }}
                          disabled={props.actionLoadingKey === `pin-post:${post.id}`}
                        >
                          <MenuItemLabel icon={<PinIcon />} label={post.pinnedByCurrentUser ? 'Unpin' : 'Pin'} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuPostId(null);
                            props.onToggleFavoritePost(post);
                          }}
                          disabled={props.actionLoadingKey === `favorite-post:${post.id}`}
                        >
                          <MenuItemLabel icon={<StarIcon />} label={post.favoritedByCurrentUser ? 'Unfavorite' : 'Favorite'} />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="community-post-body">{post.body}</div>

                <div className="community-post-tags">
                  {post.pinnedByCurrentUser ? <span className="community-pill">Pinned</span> : null}
                  {post.favoritedByCurrentUser ? <span className="community-pill">Favorite</span> : null}
                  {post.hiddenByCurrentUser ? <span className="community-pill">Archived</span> : null}
                  {post.status === 'deleted' ? <span className="community-pill">Deleted</span> : null}
                </div>

                {isOwner ? <div className="community-owner-note">{getDeleteHelpText(post)}</div> : null}

                <div className="community-post-actions">
                  <div className="community-action-group">
                    <button
                      className={`community-action-btn community-action-btn-icon ${post.likedByCurrentUser ? 'is-active' : ''}`}
                      type="button"
                      aria-label={post.likedByCurrentUser ? 'Remove like from post' : 'Like post'}
                      onClick={() => props.onToggleLikePost(post)}
                      disabled={props.actionLoadingKey === `like-post:${post.id}`}
                    >
                      <ThumbUpIcon />
                    </button>
                    <span className="community-action-count">{post.likesCount}</span>
                  </div>
                </div>

                <div className="community-comments">
                  <div className="community-comments-head">
                    <div>
                      <div className="community-comments-title">Comments</div>
                      <div className="community-comments-count">{displayComments.length}</div>
                    </div>

                    <label className="community-comment-filter">
                      <span>Sort</span>
                      <select value={currentSort} onChange={(event) => props.onCommentSortChange(post.id, event.target.value as CommunityCommentSort)}>
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
                          <div className="community-comment-author">
                            <UserAvatar name={comment.authorName} avatarUrl={comment.authorAvatarUrl} className="community-avatar community-avatar-small" />

                            <div className="community-comment-meta">
                              <div>
                                <span>{comment.authorName}</span>
                                {comment.userId === post.userId ? <span className="community-author-badge">Poster</span> : null}
                              </div>
                              <span title={new Date(comment.createdAt).toLocaleString()}>{getCommunityRelativeTime(comment.createdAt)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="community-comment-body">{comment.body}</div>

                        <div className="community-comment-actions">
                          <div className="community-action-group">
                            <button
                              className={`community-action-btn community-action-btn-icon ${comment.likedByCurrentUser ? 'is-active' : ''}`}
                              type="button"
                              aria-label={comment.likedByCurrentUser ? 'Remove like from comment' : 'Like comment'}
                              onClick={() => props.onToggleLikeComment(post.id, comment)}
                              disabled={props.actionLoadingKey === `like-comment:${comment.id}`}
                            >
                              <ThumbUpIcon />
                            </button>
                            <span className="community-action-count">{comment.likesCount}</span>
                          </div>
                          <button
                            className="community-action-btn"
                            type="button"
                            onClick={() => props.onToggleFavoriteComment(post.id, comment)}
                            disabled={props.actionLoadingKey === `favorite-comment:${comment.id}`}
                          >
                            <StarIcon /> {comment.favoritedByCurrentUser ? 'Unfavorite' : 'Favorite'}
                          </button>
                        </div>
                      </div>
                    )) : (
                      <div className="community-comment-empty">No comments match this filter yet.</div>
                    )}
                  </div>

                  {post.status === 'open' ? (
                    <div className="community-comment-form">
                      <textarea
                        className="modal-textarea community-comment-textarea"
                        rows={3}
                        maxLength={2000}
                        placeholder="Offer help, ask a follow-up question, or add more detail."
                        value={props.commentDrafts[post.id] || ''}
                        onChange={(event) => props.onCommentChange(post.id, event.target.value)}
                      />
                      {props.commentErrors[post.id] ? <div className="field-error">{props.commentErrors[post.id]}</div> : null}
                      <div className="community-comment-actions-row">
                        <button
                          className="community-submit-btn community-submit-btn-small"
                          type="button"
                          onClick={() => props.onCommentSubmit(post.id)}
                          disabled={props.commentLoadingId === post.id}
                        >
                          {props.commentLoadingId === post.id ? 'Posting...' : 'Comment'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="community-owner-note">Deleted posts stay visible here for the owner, but they are read-only.</div>
                  )}
                </div>
              </article>
            );
          })}
        </section>

        {/* Right rail: keep compose and guidance here so another agent can style it independently from the feed. */}
        <aside className="community-compose-card">
          <div className="community-compose-top">
            <div>
              <div className="view-title">Create Post</div>
              <div className="view-sub">Share what you need help with and let others jump in.</div>
            </div>
            <button className="community-refresh-btn" type="button" onClick={props.onRefresh} disabled={props.loading}>
              {props.loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {props.status?.text ? <div className={`status-banner ${props.status.tone}`}>{props.status.text}</div> : null}

          <div className="community-guidance">
            <div className="community-guidance-row">
              <strong>Delete</strong>
              <span>Only the poster sees Delete, and only during the first 24 hours.</span>
            </div>
            <div className="community-guidance-row">
              <strong>Pin + Favorite</strong>
              <span>Pin keeps a post at the top of your feed. Favorite saves it to your own collections.</span>
            </div>
            <div className="community-guidance-row">
              <strong>Hide</strong>
              <span>Hidden posts move into Archived for the current user.</span>
            </div>
          </div>

          <div className="community-form">
            <div className="modal-field">
              <label className="modal-label" htmlFor="community-title">Post title</label>
              <input
                id="community-title"
                className="modal-input"
                type="text"
                maxLength={120}
                placeholder="Need help with algebra homework"
                value={props.postValues.title}
                onChange={(event) => props.onPostChange('title', event.target.value)}
              />
              {props.postErrors.title ? <div className="field-error">{props.postErrors.title}</div> : null}
            </div>

            <div className="modal-field">
              <label className="modal-label" htmlFor="community-body">Details</label>
              <textarea
                id="community-body"
                className="modal-textarea community-post-textarea"
                rows={6}
                maxLength={4000}
                placeholder="Explain the assignment, where you are stuck, and what kind of help would be most useful."
                value={props.postValues.body}
                onChange={(event) => props.onPostChange('body', event.target.value)}
              />
              {props.postErrors.body ? <div className="field-error">{props.postErrors.body}</div> : null}
            </div>

            <button className="community-submit-btn" type="button" onClick={props.onPostSubmit} disabled={props.posting}>
              {props.posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
