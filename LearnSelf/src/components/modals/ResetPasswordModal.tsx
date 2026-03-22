import type { StatusMessage } from '../../types';

interface ResetPasswordModalProps {
  open: boolean;
  password: string;
  confirmPassword: string;
  loading: boolean;
  status?: StatusMessage | null;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function ResetPasswordModal(props: ResetPasswordModalProps) {
  if (!props.open) return null;

  return (
    <div className="fp-overlay show" onClick={(event) => event.target === event.currentTarget && props.onClose()}>
      <div className="fp-modal">
        <button className="fp-close" type="button" onClick={props.onClose} aria-label="Close">
          <CloseIcon />
        </button>
        <div className="fp-title">Choose a New Password</div>
        <div className="fp-sub">You are signed in through a recovery link. Set a new password to finish resetting your account.</div>
        <div className="field-wrap modal-tight">
          <label className="field-label" htmlFor="rp-password">New Password</label>
          <input className="field-input" id="rp-password" type="password" autoComplete="new-password" value={props.password} onChange={(event) => props.onPasswordChange(event.target.value)} />
        </div>
        <div className="field-wrap modal-tight">
          <label className="field-label" htmlFor="rp-confirm-password">Confirm Password</label>
          <input className="field-input" id="rp-confirm-password" type="password" autoComplete="new-password" value={props.confirmPassword} onChange={(event) => props.onConfirmPasswordChange(event.target.value)} />
        </div>
        {props.status?.text ? <div className={`status-banner ${props.status.tone} show`}>{props.status.text}</div> : null}
        <button className={`fp-send-btn ${props.loading ? 'btn-loading' : ''}`} type="button" onClick={props.onSubmit} disabled={props.loading}>
          {props.loading ? 'Updating password...' : 'Update Password'}
        </button>
      </div>
    </div>
  );
}
