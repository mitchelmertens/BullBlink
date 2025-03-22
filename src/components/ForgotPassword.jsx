import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });

      if (error) throw error;
      setSuccess(true);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-container">
        <div className="success-message">
          <h3>Check Your Email</h3>
          <p>We've sent password reset instructions to your email address. Please check your inbox and follow the link to reset your password.</p>
        </div>
        <div className="forgot-password">
          <a href="#" onClick={(e) => { e.preventDefault(); onBack(); }}>Back to Login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-header">
        <h2>Reset Password</h2>
        <p>Enter your email to receive reset instructions</p>
      </div>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleResetPassword}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="example@gmail.com"
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset Instructions'}
        </button>
        <div className="forgot-password">
          <a href="#" onClick={(e) => { e.preventDefault(); onBack(); }}>Back to Login</a>
        </div>
      </form>
    </div>
  );
} 