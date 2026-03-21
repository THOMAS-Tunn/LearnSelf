import { UserAvatar } from '../common/UserAvatar';
import type { FriendRecord, FriendSearchResult, StatusMessage } from '../../types';

interface FriendsViewProps {
  friends: FriendRecord[];
  loading: boolean;
  status: StatusMessage | null;
  searchQuery: string;
  searchResults: FriendSearchResult[];
  searchLoading: boolean;
  searchStatus: StatusMessage | null;
  selectedFriendshipIds: string[];
  activeProfile: FriendSearchResult | null;
  actionLoadingKey: string | null;
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
  onSelectSearchResult: (profile: FriendSearchResult) => void;
  onCloseProfile: () => void;
  onAddFriend: (profile: FriendSearchResult) => void;
  onToggleFriendSelection: (friendshipId: string, checked: boolean) => void;
  onRemoveFriend: (friend: FriendRecord) => void;
  onRemoveSelectedFriends: () => void;
}

export function FriendsView(props: FriendsViewProps) {
  const hasSelections = Boolean(props.selectedFriendshipIds.length);

  return (
    <div className="view active" id="view-friends">
      <div className="friends-layout">
        <section className="simple-view-card friends-search-card">
          <div className="view-title">Find Friends</div>
          <div className="view-sub">Search by email address or by name. Matching names keep their email visible so you can choose the right person.</div>

          <div className="friends-search-row">
            <input
              className="modal-input"
              type="text"
              placeholder="Enter a name or email"
              value={props.searchQuery}
              onChange={(event) => props.onSearchQueryChange(event.target.value)}
            />
            <button className="community-submit-btn community-submit-btn-small" type="button" onClick={props.onSearch} disabled={props.searchLoading}>
              {props.searchLoading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {props.searchStatus?.text ? <div className={`status-banner ${props.searchStatus.tone}`}>{props.searchStatus.text}</div> : null}

          <div className="friends-search-results">
            {props.searchResults.length ? props.searchResults.map((result) => (
              <button key={result.userId} className="friends-search-result" type="button" onClick={() => props.onSelectSearchResult(result)}>
                <UserAvatar name={result.name} avatarUrl={result.avatarUrl} className="community-avatar" />
                <span>{result.name} ({result.email || 'No email'})</span>
              </button>
            )) : (
              <div className="community-comment-empty">Search results will appear here.</div>
            )}
          </div>
        </section>

        <section className="simple-view-card friends-list-card">
          <div className="friends-list-head">
            <div>
              <div className="view-title">Friends</div>
              <div className="view-sub">Delete one friend at a time or select several for bulk deletion.</div>
            </div>

            <button
              className="action-pill del"
              type="button"
              onClick={props.onRemoveSelectedFriends}
              disabled={!hasSelections || props.actionLoadingKey?.startsWith('remove-friends:')}
            >
              Delete Selected
            </button>
          </div>

          {props.status?.text ? <div className={`status-banner ${props.status.tone}`}>{props.status.text}</div> : null}

          {props.loading && !props.friends.length ? (
            <div className="community-comment-empty">Loading friends...</div>
          ) : null}

          {!props.loading && !props.friends.length ? (
            <div className="community-comment-empty">No friends added yet.</div>
          ) : null}

          <div className="friends-list">
            {props.friends.map((friend) => (
              <div key={friend.friendshipId} className="friends-list-item">
                <input
                  className="cb"
                  type="checkbox"
                  checked={props.selectedFriendshipIds.includes(friend.friendshipId)}
                  onChange={(event) => props.onToggleFriendSelection(friend.friendshipId, event.target.checked)}
                />

                <div className="friends-list-copy">
                  <div className="friends-list-user">
                    <UserAvatar name={friend.name} avatarUrl={friend.avatarUrl} className="community-avatar community-avatar-small" />
                    <div>
                      <div>{friend.name}</div>
                      <div className="friends-muted-copy">{friend.email || 'No email'}</div>
                    </div>
                  </div>

                  <button
                    className="community-action-btn"
                    type="button"
                    onClick={() => props.onRemoveFriend(friend)}
                    disabled={props.actionLoadingKey === `remove-friends:${friend.friendshipId}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {props.activeProfile ? (
        <div className="friends-modal-backdrop" onClick={props.onCloseProfile}>
          <div className="friends-modal-card" onClick={(event) => event.stopPropagation()}>
            <UserAvatar name={props.activeProfile.name} avatarUrl={props.activeProfile.avatarUrl} className="profile-avatar-big friends-modal-avatar" />
            <div className="view-title">{props.activeProfile.name}</div>
            <div className="view-sub">{props.activeProfile.email || 'No email'}</div>

            <button
              className="community-submit-btn"
              type="button"
              onClick={() => props.onAddFriend(props.activeProfile!)}
              disabled={
                props.activeProfile.isCurrentUser
                || props.activeProfile.isAlreadyFriend
                || props.actionLoadingKey === `add-friend:${props.activeProfile.userId}`
              }
            >
              {props.activeProfile.isCurrentUser
                ? 'This is you'
                : props.activeProfile.isAlreadyFriend
                  ? 'Already Friends'
                  : props.actionLoadingKey === `add-friend:${props.activeProfile.userId}`
                    ? 'Adding...'
                    : 'Add Friend'}
            </button>

            <button className="community-action-btn" type="button" onClick={props.onCloseProfile}>Close</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
