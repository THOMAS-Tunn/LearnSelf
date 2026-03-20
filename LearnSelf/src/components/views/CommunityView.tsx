import { canWithdrawCommunityPost, getCommunityRelativeTime, getWithdrawHelpText } from '../../lib/community';
import type { CommunityPost, CommunityPostFormValues, StatusMessage } from '../../types';

interface CommunityViewProps {
  currentUserId: string;
  posts: CommunityPost[];
  loading: boolean;
  status: StatusMessage | null;
  postValues: CommunityPostFormValues;
  postErrors: Partial<Record<keyof CommunityPostFormValues, string>>;
  posting: boolean;
  commentDrafts: Record<string, string>;
  commentErrors: Record<string, string | undefined>;
  commentLoadingId: string | null;
  withdrawingId: string | null;
  onPostChange: (field: keyof CommunityPostFormValues, value: string) => void;
  onPostSubmit: () => void;
  onCommentChange: (postId: string, value: string) => void;
  onCommentSubmit: (postId: string) => void;
  onWithdraw: (post: CommunityPost) => void;
  onRefresh: () => void;
}

export function CommunityView(props: CommunityViewProps) {
  return (
    <div className="view active" id="view-community">
      <div className="community-layout">
        <aside className="community-compose-card">
          <div className="community-compose-top">
            <div>
              <div className="view-title">Community</div>
              <div className="view-sub">Ask for help, offer help, and keep the thread together in one place.</div>
            </div>
            <button className="community-refresh-btn" type="button" onClick={props.onRefresh} disabled={props.loading}>
              {props.loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {props.status?.text ? <div className={`status-banner ${props.status.tone}`}>{props.status.text}</div> : null}

          <div className="community-guidance">
            <div className="community-guidance-row">
              <strong>Posting</strong>
              <span>Share the exact help you need so others can jump in quickly.</span>
            </div>
            <div className="community-guidance-row">
              <strong>Comments</strong>
              <span>Anyone in the community can reply, including the original poster.</span>
            </div>
            <div className="community-guidance-row">
              <strong>Withdrawal</strong>
              <span>Posters can withdraw within 24 hours. After that, they need admin help.</span>
            </div>
          </div>

          <div className="community-form">
            <div className="modal-field">
              <label className="modal-label" htmlFor="community-title">Request title</label>
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
              <label className="modal-label" htmlFor="community-body">What do you need?</label>
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
              {props.posting ? 'Posting...' : 'Post Request'}
            </button>
          </div>
        </aside>

        <section className="community-feed">
          {props.loading && !props.posts.length ? (
            <div className="community-empty-card">
              <div className="community-empty-title">Loading requests...</div>
              <div className="community-empty-copy">Pulling the latest help requests and discussion threads.</div>
            </div>
          ) : null}

          {!props.loading && !props.posts.length ? (
            <div className="community-empty-card">
              <div className="community-empty-title">No requests yet</div>
              <div className="community-empty-copy">Be the first person to ask for help or offer support.</div>
            </div>
          ) : null}

          {props.posts.map((post) => {
            const isOwner = post.userId === props.currentUserId;
            const canWithdraw = isOwner && canWithdrawCommunityPost(post);

            return (
              <article key={post.id} className="community-post-card">
                <div className="community-post-top">
                  <div className="community-post-copy">
                    <div className="community-post-title">{post.title}</div>
                    <div className="community-post-meta" title={new Date(post.createdAt).toLocaleString()}>
                      <span>{post.authorName}</span>
                      <span>{getCommunityRelativeTime(post.createdAt)}</span>
                    </div>
                  </div>

                  {isOwner ? (
                    <div className="community-post-actions">
                      <button
                        className="community-withdraw-btn"
                        type="button"
                        onClick={() => props.onWithdraw(post)}
                        disabled={!canWithdraw || props.withdrawingId === post.id}
                      >
                        {props.withdrawingId === post.id ? 'Withdrawing...' : 'Withdraw'}
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="community-post-body">{post.body}</div>
                {isOwner ? <div className="community-owner-note">{getWithdrawHelpText(post)}</div> : null}

                <div className="community-comments">
                  <div className="community-comments-head">
                    <div className="community-comments-title">Comments</div>
                    <div className="community-comments-count">{post.comments.length}</div>
                  </div>

                  <div className="community-comment-list">
                    {post.comments.length ? post.comments.map((comment) => (
                      <div key={comment.id} className="community-comment">
                        <div className="community-comment-meta">
                          <div className="community-comment-author">
                            <span>{comment.authorName}</span>
                            {comment.userId === post.userId ? <span className="community-author-badge">Poster</span> : null}
                          </div>
                          <span title={new Date(comment.createdAt).toLocaleString()}>{getCommunityRelativeTime(comment.createdAt)}</span>
                        </div>
                        <div className="community-comment-body">{comment.body}</div>
                      </div>
                    )) : (
                      <div className="community-comment-empty">No comments yet. Start the conversation here.</div>
                    )}
                  </div>

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
                    <div className="community-comment-actions">
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
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}
