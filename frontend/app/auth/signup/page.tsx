"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "../auth.module.css";

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:8081";

function getPasswordStrength(password: string): {
  strength: string;
  message: string;
  isValid: boolean;
} {
  if (!password) {
    return { strength: "none", message: "", isValid: false };
  }

  if (password.length < 8) {
    return {
      strength: "weak",
      message: "At least 8 characters required",
      isValid: false,
    };
  }

  const hasLetters = /[a-zA-Z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecial = /[@$!%*?&]/.test(password);

  if (!hasLetters || !hasNumbers || !hasSpecial) {
    const missing = [];
    if (!hasLetters) missing.push("letters");
    if (!hasNumbers) missing.push("numbers");
    if (!hasSpecial) missing.push("special characters");
    return {
      strength: "weak",
      message: `Add ${missing.join(", ")}`,
      isValid: false,
    };
  }

  return { strength: "strong", message: "Strong password ✓", isValid: true };
}

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordStrength.isValid) {
      setError(
        "Password must contain letters, numbers, and special characters",
      );
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${AUTH_URL}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail?.error || "Signup failed");
      }

      // Save token and redirect
      localStorage.setItem("token", data.data.token);
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1>Sign Up</h1>
        {error && <div className={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "18px",
                padding: "0",
              }}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "🙈" : "👁"}
            </button>
          </div>

          {password && (
            <div
              style={{
                fontSize: "12px",
                marginTop: "5px",
                color: passwordStrength.isValid ? "#10b981" : "#f59e0b",
              }}
            >
              {passwordStrength.message}
            </div>
          )}

          <div style={{ fontSize: "12px", marginTop: "8px", color: "#666" }}>
            ✓ At least 8 characters
            <br />
            ✓ Letters (a-z, A-Z)
            <br />
            ✓ Numbers (0-9)
            <br />✓ Special characters (@$!%*?&)
          </div>

          <button type="submit" disabled={loading || !passwordStrength.isValid}>
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </form>
        <p>
          Already have an account? <Link href="/auth/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
