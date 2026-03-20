import type { StatusMessage, UserProfile } from '../../types';

interface ProfileViewProps {
  currentUser: UserProfile;
  activeCount: number;
  finishedCount: number;
  profileName: string;
  profileEmail: string;
  profilePassword: string;
  profileConfirmPassword: string;
  loading: boolean;
  status?: StatusMessage | null;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
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
  profilePassword,
  profileConfirmPassword,
  loading,
  status,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit
}: ProfileViewProps) {
  const avatar = currentUser.name[0]?.toUpperCase() || 'S';

  return (
    <div className="view active">
      <div className="simple-view-card profile-card">
        <div className="profile-avatar-big">{avatar}</div>
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
          <div className="view-sub profile-edit-sub">Update your name, email, and password here.</div>

          <div className="modal-field">
            <label className="modal-label" htmlFor="profile-name">Display Name</label>
            <input className="modal-input" id="profile-name" type="text" value={profileName} onChange={(event) => onNameChange(event.target.value)} />
          </div>

          <div className="modal-field">
            <label className="modal-label" htmlFor="profile-email">Email</label>
            <input className="modal-input" id="profile-email" type="email" value={profileEmail} onChange={(event) => onEmailChange(event.target.value)} />
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
