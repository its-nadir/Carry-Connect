"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./auth.module.css";

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    phone: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const { signIn, signUp } = await import("../../lib/auth");
      const searchParams = new URLSearchParams(window.location.search);
      const redirectUrl = searchParams.get("redirect") || "/";

      if (isLogin) {
        await signIn(formData.email, formData.password);
        setSuccessMsg("Login successful!");
        router.push(redirectUrl);
      } else {
        await signUp(formData.email, formData.password, formData.name, formData.phone);
        setSuccessMsg("Account created successfully!");
        router.push(redirectUrl);
      }
    } catch (err) {
      console.error("Auth error:", err);
      let message = "An error occurred. Please try again.";
      if (err.message.includes("auth/invalid-credential") || err.message.includes("auth/user-not-found") || err.message.includes("auth/wrong-password")) {
        message = "Wrong email or password.";
      } else if (err.message.includes("auth/email-already-in-use")) {
        message = "This email is already registered.";
      } else if (err.message.includes("auth/weak-password")) {
        message = "Password should be at least 6 characters.";
      } else if (err.message.includes("auth/invalid-email")) {
        message = "Please enter a valid email address.";
      }
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.authBox}>
        <h1 className={styles.title}>
          {isLogin ? "Welcome Back!" : "Create Account"}
        </h1>
        <p className={styles.subtitle}>
          {isLogin ? "Login to continue" : "Sign up to get started"}
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          {!isLogin && (
            <>
              <div className={styles.inputGroup}>
                <label>Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter your name"
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  placeholder="Enter your phone"
                />
              </div>
            </>
          )}

          <div className={styles.inputGroup}>
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
              minLength="6"
            />
          </div>

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          {successMsg && (
            <div className={styles.success}>
              {successMsg}
            </div>
          )}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? "Please wait..." : (isLogin ? "Login" : "Sign Up")}
          </button>

          <div className={styles.divider}>
            <span>OR</span>
          </div>

          <button
            type="button"
            onClick={async () => {
              try {
                const { signInWithGoogle } = await import("../../lib/auth");
                await signInWithGoogle();
                const searchParams = new URLSearchParams(window.location.search);
                const redirectUrl = searchParams.get("redirect") || "/";
                router.push(redirectUrl);
              } catch (err) {
                console.error("Google login error:", err);
                setError("Failed to sign in with Google.");
              }
            }}
            className={styles.googleBtn}
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: "20px", height: "20px" }} />
            Sign in with Google
          </button>


        </form>

        <p className={styles.switchText}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
            className={styles.switchBtn}
          >
            {isLogin ? "Sign Up" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
}
