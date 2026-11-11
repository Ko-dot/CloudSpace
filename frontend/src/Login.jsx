import { useState, useEffect } from "react";
import { Cloud } from "lucide-react";
import "./Login.css";

const API_URL = "http://127.0.0.1:8000";

export default function Login({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get("access_token");

    if (token) {
      localStorage.setItem("cloudspace_token", token);
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname + window.location.search
      );
      onLogin(token);
    }
  }, [onLogin]);

  const handleTelegramLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/auth/telegram/start`);

      if (!response.ok) {
        throw new Error("Could not start Telegram login. Check backend settings.");
      }

      const data = await response.json();

      if (!data.authorization_url) {
        throw new Error("Authorization URL was not returned by the backend.");
      }

      window.location.href = data.authorization_url;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <Cloud size={32} />
        </div>

        <h1>Welcome to CloudSpace</h1>
        <p className="login-subtitle">
          Your personal space. Your files. Your control.
        </p>

        <button
          className="telegram-login-button"
          onClick={handleTelegramLogin}
          disabled={loading}
        >
          {loading ? "Connecting..." : "Continue with Telegram"}
        </button>

        {error && <p className="login-error">{error}</p>}

        <p className="login-footer">
          Secure access to your personal cloud storage.
        </p>
      </div>
    </div>
  );
}