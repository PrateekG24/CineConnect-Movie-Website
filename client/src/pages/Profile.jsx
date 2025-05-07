import { useState, useEffect } from "react";
import { userAPI } from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import Alert from "../components/Alert";
import "./Auth.css";

const Profile = ({ user, updateUser }) => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Reset messages
    setError(null);
    setSuccess(null);

    // Validate form
    if (password && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Prepare update data - only include fields that have values
    const updateData = {};
    if (username && username !== user.username) updateData.username = username;
    if (email && email !== user.email) updateData.email = email;
    if (password) updateData.password = password;

    // Don't submit if no changes
    if (Object.keys(updateData).length === 0) {
      setError("No changes to update");
      return;
    }

    setLoading(true);

    try {
      const response = await userAPI.updateProfile(updateData);

      // Update local user data
      if (updateUser && response.data) {
        updateUser({
          ...user,
          ...updateData,
          password: undefined, // Don't store password in local state
          pendingEmail: response.data.pendingEmail || null,
        });
      }

      setSuccess(response.data.message || "Profile updated successfully");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(
        err.response?.data?.message ||
          "Failed to update profile. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      setResendingVerification(true);
      setError(null);

      const response = await userAPI.resendVerification();
      setSuccess(
        response.data.message || "Verification email sent successfully"
      );
    } catch (err) {
      console.error("Error resending verification:", err);
      setError(
        err.response?.data?.message ||
          "Failed to resend verification email. Please try again."
      );
    } finally {
      setResendingVerification(false);
    }
  };

  // Determine if verification message should be shown
  const shouldShowVerification = !user?.isEmailVerified || user?.pendingEmail;
  const verificationMessage = user?.pendingEmail
    ? `Verification email sent to ${user.pendingEmail}. Please check your inbox.`
    : "Your email is not verified. Please check your inbox for verification email.";

  return (
    <div className="auth-container">
      <div className="auth-card profile-card">
        <h1>My Profile</h1>

        {shouldShowVerification && (
          <div className="verification-alert">
            <Alert type="warning" message={verificationMessage} />
            <button
              className="resend-btn"
              onClick={handleResendVerification}
              disabled={resendingVerification}
            >
              {resendingVerification ? (
                <LoadingSpinner small />
              ) : (
                "Resend verification email"
              )}
            </button>
          </div>
        )}

        {error && <Alert type="danger" message={error} />}
        {success && <Alert type="success" message={success} />}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <div className="email-field">
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              {user?.isEmailVerified && !user?.pendingEmail && (
                <span className="verified-badge">✓ Verified</span>
              )}
            </div>
            {user?.pendingEmail && (
              <div className="pending-email-note">
                Pending change to: {user.pendingEmail}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">
              New Password (leave blank to keep current)
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? <LoadingSpinner small /> : "Update Profile"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
