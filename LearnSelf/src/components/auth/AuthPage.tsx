import type { FormEvent } from 'react';
import type { StatusMessage } from '../../types';

interface AuthPageProps {
  isSignup: boolean;
  loginEmail: string;
  loginPassword: string;
  signupName: string;
  signupEmail: string;
  signupPassword: string;
  showLoginPassword: boolean;
  showSignupPassword: boolean;
  loginErrors: { email?: string; password?: string };
  signupErrors: { name?: string; email?: string; password?: string };
  loginStatus?: StatusMessage | null;
  signupStatus?: StatusMessage | null;
  loginLoading: boolean;
  signupLoading: boolean;
  onToggleMode: (nextSignup: boolean) => void;
  onLoginEmailChange: (value: string) => void;
  onLoginPasswordChange: (value: string) => void;
  onSignupNameChange: (value: string) => void;
  onSignupEmailChange: (value: string) => void;
  onSignupPasswordChange: (value: string) => void;
  onToggleLoginPassword: () => void;
  onToggleSignupPassword: () => void;
  onLoginSubmit: () => void;
  onSignupSubmit: () => void;
  onForgotPasswordOpen: () => void;
}

function StatusBanner({ status }: { status?: StatusMessage | null }) {
  if (!status?.text) return null;
  return <div className={`status-banner ${status.tone} show`}>{status.text}</div>;
}

export function AuthPage(props: AuthPageProps) {
  const handleLoginSubmit = (event: FormEvent) => {
    event.preventDefault();
    props.onLoginSubmit();
  };

  const handleSignupSubmit = (event: FormEvent) => {
    event.preventDefault();
    props.onSignupSubmit();
  };

  return (
    <div id="login-page">
      <button className="signup-corner-btn" type="button" onClick={() => props.onToggleMode(!props.isSignup)}>
        {props.isSignup ? 'Log in' : 'Sign up'}
      </button>

      <div className={`login-card ${props.isSignup ? 'signup-mode' : ''}`}>
        <div className="login-logo">Learn<span>self</span></div>
        <div className="login-sub login-sub-login">Student assignment manager</div>
        <div className="login-sub login-sub-signup">Create your free account</div>

        {!props.isSignup ? (
          <form id="login-fields" onSubmit={handleLoginSubmit}>
            <div className="field-wrap">
              <label className="field-label" htmlFor="login-email">Email</label>
              <input className="field-input" id="login-email" type="email" placeholder="you@school.edu" autoComplete="email" value={props.loginEmail} onChange={(e) => props.onLoginEmailChange(e.target.value)} />
              {props.loginErrors.email ? <div className="field-error show">{props.loginErrors.email}</div> : null}
            </div>
            <div className="field-wrap">
              <label className="field-label" htmlFor="login-pw">Password</label>
              <div className="pw-wrap">
                <input className="field-input" id="login-pw" type={props.showLoginPassword ? 'text' : 'password'} placeholder="Your Password" autoComplete="current-password" value={props.loginPassword} onChange={(e) => props.onLoginPasswordChange(e.target.value)} />
                <button className="pw-eye" type="button" onClick={props.onToggleLoginPassword}>{props.showLoginPassword ? 'Hide' : 'Show'}</button>
              </div>
              {props.loginErrors.password ? <div className="field-error show">{props.loginErrors.password}</div> : null}
            </div>
            <button className={`login-btn ${props.loginLoading ? 'btn-loading' : ''}`} type="submit" disabled={props.loginLoading}>
              {props.loginLoading ? 'Logging in...' : 'Log in'}
            </button>
            <div className="forgot-pw">Forgot password? <button type="button" className="inline-link" onClick={props.onForgotPasswordOpen}>Click here</button></div>
            <StatusBanner status={props.loginStatus} />
          </form>
        ) : (
          <form id="signup-fields" onSubmit={handleSignupSubmit}>
            <div className="field-wrap">
              <label className="field-label" htmlFor="su-name">Full Name</label>
              <input className="field-input" id="su-name" type="text" placeholder="Your name" value={props.signupName} onChange={(e) => props.onSignupNameChange(e.target.value)} />
              {props.signupErrors.name ? <div className="field-error show">{props.signupErrors.name}</div> : null}
            </div>
            <div className="field-wrap">
              <label className="field-label" htmlFor="su-email">Email</label>
              <input className="field-input" id="su-email" type="email" placeholder="you@school.edu" value={props.signupEmail} onChange={(e) => props.onSignupEmailChange(e.target.value)} />
              {props.signupErrors.email ? <div className="field-error show">{props.signupErrors.email}</div> : null}
            </div>
            <div className="field-wrap">
              <label className="field-label" htmlFor="su-pw">Password</label>
              <div className="pw-wrap">
                <input className="field-input" id="su-pw" type={props.showSignupPassword ? 'text' : 'password'} placeholder="Min. 5 characters" autoComplete="new-password" value={props.signupPassword} onChange={(e) => props.onSignupPasswordChange(e.target.value)} />
                <button className="pw-eye" type="button" onClick={props.onToggleSignupPassword}>{props.showSignupPassword ? 'Hide' : 'Show'}</button>
              </div>
              {props.signupErrors.password ? <div className="field-error show">{props.signupErrors.password}</div> : null}
            </div>
            <button className={`login-btn ${props.signupLoading ? 'btn-loading' : ''}`} type="submit" disabled={props.signupLoading}>
              {props.signupLoading ? 'Creating account...' : 'Create Account'}
            </button>
            <div className="forgot-pw">Already have an account? <button type="button" className="inline-link" onClick={() => props.onToggleMode(false)}>Log in</button></div>
            <StatusBanner status={props.signupStatus} />
          </form>
        )}
      </div>
    </div>
  );
}
