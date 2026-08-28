import './OtpDialog.css';
import { JSX, useRef, useState } from 'react';
import { exchangeToken, FetchFn, MAX_OTP_ATTEMPTS, storeSessionToken } from '../../otpApi';

export type OtpDialogProps = {
  onSuccess: () => void;
  fetchFn?: FetchFn;
};

type DialogState = 'input' | 'loading' | 'fatal';

export function OtpDialog({ onSuccess, fetchFn = fetch }: OtpDialogProps): JSX.Element {
  const [otpValue, setOtpValue] = useState('');
  const [attempt, setAttempt] = useState(1);
  const [error, setError] = useState('');
  const [state, setState] = useState<DialogState>('input');
  const inFlightRef = useRef(false);

  const handleSubmit = async (): Promise<void> => {
    if (!otpValue.trim() || inFlightRef.current) return;

    inFlightRef.current = true;
    setState('loading');
    setError('');

    const result = await exchangeToken(otpValue.trim(), fetchFn);

    if (result.ok) {
      storeSessionToken(result.token, result.expiresIn);
      onSuccess();
      inFlightRef.current = false;
      return;
    }

    if (result.shutdown) {
      setState('fatal');
      inFlightRef.current = false;
      return;
    }

    if (/network error/i.test(result.error)) {
      setError(result.error);
      setState('input');
      inFlightRef.current = false;
      return;
    }

    if (attempt >= MAX_OTP_ATTEMPTS) {
      setState('fatal');
      inFlightRef.current = false;
      return;
    }

    const nextAttempt = attempt + 1;
    setAttempt(nextAttempt);
    setError(`${result.error} — attempt ${nextAttempt} of ${MAX_OTP_ATTEMPTS}`);
    setOtpValue('');
    setState('input');
    inFlightRef.current = false;
  };

  if (state === 'fatal') {
    return (
      <div className="otp">
        <div className="otp__top" />
        <div
          className="otp__dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="otp-fatal-title"
        >
          <p className="otp__fatal-title" id="otp-fatal-title">
            reditor — session terminated
          </p>
          <p className="otp__fatal-message">
            Too many failed attempts.
            <br />
            The server has shut down for security.
          </p>
        </div>
        <div className="otp__bottom" />
      </div>
    );
  }

  const isLoading = state === 'loading';

  return (
    <div className="otp">
      <div className="otp__top" />
      <div
        className="otp__dialog"
        role="dialog"
        aria-modal="true"
        aria-label="One-time password"
        aria-busy={isLoading}
      >
        <div className="otp__field">
          <label className="otp__label" htmlFor="otp-input">
            Enter OTP:
          </label>
          <input
            id="otp-input"
            className="otp__input"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
            spellCheck={false}
            autoFocus
            value={otpValue}
            onChange={(e) => setOtpValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleSubmit();
            }}
            disabled={isLoading}
          />
        </div>
        <div className="otp__actions">
          {isLoading ? (
            <span className="otp__spinner" aria-hidden="true" />
          ) : (
            <button className="otp__submit" type="button" onClick={() => void handleSubmit()}>
              Submit
            </button>
          )}
        </div>
      </div>
      <div className="otp__bottom">
        {error && (
          <p className="otp__error" aria-live="polite">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
