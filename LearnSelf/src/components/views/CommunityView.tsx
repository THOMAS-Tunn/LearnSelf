import { useState } from 'react';
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
                            {props.actionLoadingKey === `delete-post:${post.id}` ? 'Deleting...' : 'Delete'}
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
                          {post.hiddenByCurrentUser ? 'Unarchive' : 'Hide'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuPostId(null);
                            props.onTogglePinPost(post);
                          }}
                          disabled={props.actionLoadingKey === `pin-post:${post.id}`}
                        >
                          {post.pinnedByCurrentUser ? 'Unpin' : 'Pin'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuPostId(null);
                            props.onToggleFavoritePost(post);
                          }}
                          disabled={props.actionLoadingKey === `favorite-post:${post.id}`}
                        >
                          {post.favoritedByCurrentUser ? 'Unfavorite' : 'Favorite'}
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
                  <button
                    className="community-action-btn"
                    type="button"
                    onClick={() => props.onToggleLikePost(post)}
                    disabled={props.actionLoadingKey === `like-post:${post.id}`}
                  >
                    {post.likedByCurrentUser ? 'Unlike' : 'Like'} ({post.likesCount})
                  </button>
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
                          <button
                            className="community-action-btn"
                            type="button"
                            onClick={() => props.onToggleLikeComment(post.id, comment)}
                            disabled={props.actionLoadingKey === `like-comment:${comment.id}`}
                          >
                            {comment.likedByCurrentUser ? 'Unlike' : 'Like'} ({comment.likesCount})
                          </button>
                          <button
                            className="community-action-btn"
                            type="button"
                            onClick={() => props.onToggleFavoriteComment(post.id, comment)}
                            disabled={props.actionLoadingKey === `favorite-comment:${comment.id}`}
                          >
                            {comment.favoritedByCurrentUser ? 'Unfavorite' : 'Favorite'}
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
