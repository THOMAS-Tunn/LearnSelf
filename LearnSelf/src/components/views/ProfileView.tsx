import { UserAvatar } from '../common/UserAvatar';
import type { StatusMessage, UserProfile } from '../../types';

interface ProfileViewProps {
  currentUser: UserProfile;
  activeCount: number;
  finishedCount: number;
  profileName: string;
  profileEmail: string;
  profileAvatarUrl: string;
  profilePassword: string;
  profileConfirmPassword: string;
  loading: boolean;
  status?: StatusMessage | null;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onAvatarUrlChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: () => void;
}

export function ProfileView({
  currentUser,
  activeCount,
  finishedCount,
  profileName,
  profileEmail,
  profileAvatarUrl,
  profilePassword,
  profileConfirmPassword,
  loading,
  status,
  onNameChange,
  onEmailChange,
  onAvatarUrlChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit
}: ProfileViewProps) {
  return (
    <div className="view active">
      <div className="simple-view-card profile-card">
        <UserAvatar name={currentUser.name} avatarUrl={currentUser.avatarUrl} className="profile-avatar-big" />
        <div className="view-title">{currentUser.name}</div>
        <div className="view-sub">{currentUser.email || 'No email'}</div>
        <div className="profile-stats">
          <div className="stat-card blue-soft">
            <div className="stat-value">{activeCount}</div>
            <div className="stat-label">Active Assignments</div>
          </div>
          <div className="stat-card green-soft">
            <div className="stat-value">{finishedCount}</div>
            <div className="stat-label">Finished</div>
          </div>
        </div>

        <div className="profile-edit-section">
          <div className="view-title profile-edit-title">Account Settings</div>
          <div className="view-sub profile-edit-sub">Update your name, email, profile picture, and password here.</div>

          <div className="modal-field">
            <label className="modal-label" htmlFor="profile-name">Display Name</label>
            <input className="modal-input" id="profile-name" type="text" value={profileName} onChange={(event) => onNameChange(event.target.value)} />
          </div>

          <div className="modal-field">
            <label className="modal-label" htmlFor="profile-email">Email</label>
            <input className="modal-input" id="profile-email" type="email" value={profileEmail} onChange={(event) => onEmailChange(event.target.value)} />
          </div>

          <div className="modal-field">
            <label className="modal-label" htmlFor="profile-avatar-url">Profile Picture URL</label>
            <input className="modal-input" id="profile-avatar-url" type="url" placeholder="https://example.com/avatar.png" value={profileAvatarUrl} onChange={(event) => onAvatarUrlChange(event.target.value)} />
          </div>

          <div className="modal-row">
            <div className="modal-field">
              <label className="modal-label" htmlFor="profile-password">New Password</label>
              <input className="modal-input" id="profile-password" type="password" placeholder="Leave blank to keep current password" autoComplete="new-password" value={profilePassword} onChange={(event) => onPasswordChange(event.target.value)} />
            </div>
            <div className="modal-field">
              <label className="modal-label" htmlFor="profile-confirm-password">Confirm Password</label>
              <input className="modal-input" id="profile-confirm-password" type="password" placeholder="Repeat new password" autoComplete="new-password" value={profileConfirmPassword} onChange={(event) => onConfirmPasswordChange(event.target.value)} />
            </div>
          </div>

          {status?.text ? <div className={`status-banner ${status.tone}`}>{status.text}</div> : null}

          <button className={`modal-submit profile-save-btn ${loading ? 'btn-loading' : ''}`} type="button" onClick={onSubmit} disabled={loading}>
            {loading ? 'Saving changes...' : 'Save Account Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
