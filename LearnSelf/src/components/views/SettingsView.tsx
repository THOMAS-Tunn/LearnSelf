interface SettingsViewProps {
  onLogout: () => void;
}

export function SettingsView({ onLogout }: SettingsViewProps) {
  return (
    <div className="view active">
      <div className="simple-view-card settings-card">
        <div className="view-title">Settings</div>
        <div className="view-sub">Manage your account preferences.</div>
        <div className="settings-list">
          <label className="setting-row yellow-soft"><span>Email notifications</span><input type="checkbox" className="cb" defaultChecked /></label>
          <label className="setting-row blue-soft"><span>Show completed in dashboard</span><input type="checkbox" className="cb" /></label>
          <label className="setting-row green-soft"><span>Auto-delete trash after 30 days</span><input type="checkbox" className="cb" defaultChecked /></label>
          <button className="login-btn settings-logout" type="button" onClick={onLogout}>Log out</button>
        </div>
      </div>
    </div>
  );
}
