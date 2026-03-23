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

function EyeOpenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M1 9C1 9 4 3.5 9 3.5C14 3.5 17 9 17 9C17 9 14 14.5 9 14.5C4 14.5 1 9 1 9Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function EyeSlashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <line x1="2" y1="2" x2="16" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M7.5 4C8 3.84 8.49 3.75 9 3.75C13.5 3.75 16.5 9 16.5 9C16.04 9.9 15.47 10.73 14.82 11.46M11.25 12.74C10.56 13.07 9.8 13.25 9 13.25C4.5 13.25 1.5 8 1.5 8C2.26 6.64 3.25 5.44 4.43 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M6.88 6.9A2.5 2.5 0 0 0 11.1 11.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PasswordToggle({
  visible,
  onToggle,
  label
}: {
  visible: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      className="pw-eye"
      type="button"
      aria-label={visible ? `Hide ${label}` : `Show ${label}`}
      onClick={onToggle}
    >
      {visible ? <EyeSlashIcon /> : <EyeOpenIcon />}
    </button>
  );
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
      <button
        className="signup-corner-btn"
        type="button"
        onClick={() => props.onToggleMode(!props.isSignup)}
      >
        {props.isSignup ? 'Log in' : 'Sign up'}
      </button>

      <div className={`login-card ${props.isSignup ? 'signup-mode' : ''}`}>
        <div className="login-logo">
          Learn<span>self</span>
        </div>
        <div className="login-sub login-sub-login">Student assignment manager</div>
        <div className="login-sub login-sub-signup">Create your free account</div>

        {!props.isSignup ? (
          <form id="login-fields" onSubmit={handleLoginSubmit}>
            <div className="field-wrap">
              <label className="field-label" htmlFor="login-email">Email</label>
              <input
                className="field-input"
                id="login-email"
                name="email"
                type="email"
                placeholder="you@school.edu"
                autoComplete="email"
                value={props.loginEmail}
                onChange={(e) => props.onLoginEmailChange(e.target.value)}
                onInput={(e) => props.onLoginEmailChange((e.target as HTMLInputElement).value)}
              />
              {props.loginErrors.email
                ? <div className="field-error show">{props.loginErrors.email}</div>
                : null}
            </div>

            <div className="field-wrap">
              <label className="field-label" htmlFor="login-pw">Password</label>
              <div className="pw-wrap">
                <input
                  className="field-input"
                  id="login-pw"
                  name="password"
                  type={props.showLoginPassword ? 'text' : 'password'}
                  placeholder="Your Password"
                  autoComplete="current-password"
                  value={props.loginPassword}
                  onChange={(e) => props.onLoginPasswordChange(e.target.value)}
                  onInput={(e) => props.onLoginPasswordChange((e.target as HTMLInputElement).value)}
                />
                <PasswordToggle
                  visible={props.showLoginPassword}
                  onToggle={props.onToggleLoginPassword}
                  label="password"
                />
              </div>
              {props.loginErrors.password
                ? <div className="field-error show">{props.loginErrors.password}</div>
                : null}
            </div>

            <button
              className={`login-btn ${props.loginLoading ? 'btn-loading' : ''}`}
              type="submit"
              disabled={props.loginLoading}
            >
              {props.loginLoading ? 'Logging in...' : 'Log in'}
            </button>

            <div className="forgot-pw">
              Forgot password?{' '}
              <button type="button" className="inline-link" onClick={props.onForgotPasswordOpen}>
                Click here
              </button>
            </div>

            <StatusBanner status={props.loginStatus} />
          </form>
        ) : (
          <form id="signup-fields" onSubmit={handleSignupSubmit}>
            <div className="field-wrap">
              <label className="field-label" htmlFor="su-name">Full Name</label>
              <input
                className="field-input"
                id="su-name"
                type="text"
                placeholder="Your name"
                value={props.signupName}
                onChange={(e) => props.onSignupNameChange(e.target.value)}
              />
              {props.signupErrors.name
                ? <div className="field-error show">{props.signupErrors.name}</div>
                : null}
            </div>

            <div className="field-wrap">
              <label className="field-label" htmlFor="su-email">Email</label>
              <input
                className="field-input"
                id="su-email"
                name="email"
                type="email"
                placeholder="you@school.edu"
                autoComplete="email"
                value={props.signupEmail}
                onChange={(e) => props.onSignupEmailChange(e.target.value)}
                onInput={(e) => props.onSignupEmailChange((e.target as HTMLInputElement).value)}
              />
              {props.signupErrors.email
                ? <div className="field-error show">{props.signupErrors.email}</div>
                : null}
            </div>

            <div className="field-wrap">
              <label className="field-label" htmlFor="su-pw">Password</label>
              <div className="pw-wrap">
                <input
                  className="field-input"
                  id="su-pw"
                  name="new-password"
                  type={props.showSignupPassword ? 'text' : 'password'}
                  placeholder="Min. 5 characters"
                  autoComplete="new-password"
                  value={props.signupPassword}
                  onChange={(e) => props.onSignupPasswordChange(e.target.value)}
                  onInput={(e) => props.onSignupPasswordChange((e.target as HTMLInputElement).value)}
                />
                <PasswordToggle
                  visible={props.showSignupPassword}
                  onToggle={props.onToggleSignupPassword}
                  label="password"
                />
              </div>
              {props.signupErrors.password
                ? <div className="field-error show">{props.signupErrors.password}</div>
                : null}
            </div>

            <button
              className={`login-btn ${props.signupLoading ? 'btn-loading' : ''}`}
              type="submit"
              disabled={props.signupLoading}
            >
              {props.signupLoading ? 'Creating account...' : 'Create Account'}
            </button>

            <div className="forgot-pw">
              Already have an account?{' '}
              <button type="button" className="inline-link" onClick={() => props.onToggleMode(false)}>
                Log in
              </button>
            </div>

            <StatusBanner status={props.signupStatus} />
          </form>
        )}
      </div>
    </div>
  );
}
