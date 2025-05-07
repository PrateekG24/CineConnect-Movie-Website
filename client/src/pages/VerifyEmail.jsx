import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { userAPI } from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import Alert from "../components/Alert";
import "./Auth.css";

const VerifyEmail = ({ setUser }) => {
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const { token } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const verifyEmailToken = async () => {
      try {
        setVerifying(true);
        setError(null);

        const response = await userAPI.verifyEmail(token);

        // If verification successful, update user if needed
        if (response.data && response.data.token && setUser) {
          const userData = {
            token: response.data.token,
            email: response.data.email,
            isEmailVerified: true,
          };

          // Update local storage with verified user data
          const existingUser = JSON.parse(localStorage.getItem("user") || "{}");
          const updatedUser = { ...existingUser, ...userData };
          localStorage.setItem("user", JSON.stringify(updatedUser));

          // Update app state
          setUser(updatedUser);
        }

        setSuccess(true);
        setVerifying(false);

        // Redirect to home page after delay
        setTimeout(() => {
          navigate("/");
        }, 3000);
      } catch (err) {
        console.error("Email verification error:", err);
        setError(
          err.response?.data?.message ||
            "Failed to verify email. The link may be invalid or expired."
        );
        setVerifying(false);
      }
    };

    if (token) {
      verifyEmailToken();
    } else {
      setError("Invalid verification link");
      setVerifying(false);
    }
  }, [token, navigate, setUser]);

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Email Verification</h1>

        {verifying && (
          <div className="verification-status">
            <LoadingSpinner />
            <p>Verifying your email address...</p>
          </div>
        )}

        {error && (
          <div className="verification-status">
            <Alert type="danger" message={error} />
            <p className="mt-4">
              If your verification link has expired, you can
              <button
                className="text-link"
                onClick={() => navigate("/profile")}
              >
                request a new verification email
              </button>
            </p>
          </div>
        )}

        {success && (
          <div className="verification-status">
            <Alert
              type="success"
              message="Your email has been successfully verified!"
            />
            <p className="mt-4">
              You will be redirected to the home page shortly...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
