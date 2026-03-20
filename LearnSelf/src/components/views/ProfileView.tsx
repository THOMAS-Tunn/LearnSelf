import type { UserProfile } from '../../types';

interface ProfileViewProps {
  currentUser: UserProfile;
  activeCount: number;
  finishedCount: number;
}

export function ProfileView({ currentUser, activeCount, finishedCount }: ProfileViewProps) {
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
      </div>
    </div>
  );
}
