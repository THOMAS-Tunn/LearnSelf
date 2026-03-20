import type { StatusMessage } from '../../types';

interface ForgotPasswordModalProps {
  open: boolean;
  email: string;
  loading: boolean;
  success: boolean;
  error?: string;
  status?: StatusMessage | null;
  onEmailChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function ForgotPasswordModal(props: ForgotPasswordModalProps) {
  if (!props.open) return null;

  return (
    <div className="fp-overlay show" onClick={(event) => event.target === event.currentTarget && props.onClose()}>
      <div className="fp-modal">
        <button className="fp-close" type="button" onClick={props.onClose}>x</button>
        <div className="fp-title">Reset Password</div>
        <div className="fp-sub">Enter your email and we will send you a reset link.</div>
        <div className="field-wrap modal-tight">
          <label className="field-label" htmlFor="fp-email">Email</label>
          <input className="field-input" id="fp-email" type="email" placeholder="you@school.edu" value={props.email} onChange={(e) => props.onEmailChange(e.target.value)} />
          {props.error ? <div className="field-error show">{props.error}</div> : null}
        </div>
        {props.success ? <div className="reset-success">Reset link sent. Check your inbox.</div> : null}
        {props.status?.text ? <div className={`status-banner ${props.status.tone} show`}>{props.status.text}</div> : null}
        <button className={`fp-send-btn ${props.loading ? 'btn-loading' : ''}`} type="button" onClick={props.onSubmit} disabled={props.loading}>
          {props.loading ? 'Sending link...' : 'Send Reset Link'}
        </button>
      </div>
    </div>
  );
}
