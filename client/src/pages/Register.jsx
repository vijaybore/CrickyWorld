import { useState } from "react";

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async () => {
    if (!form.name || !form.mobile || !form.password || !form.confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.mobile,
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Registration failed. Please try again.");
        return;
      }
      localStorage.setItem("token", data.token);
      window.location.href = "/";
    } catch (err) {
      setError("Could not connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoWrap}>
          <div style={styles.logoCircle}>
            <span style={{ fontSize: "28px" }}>🏏</span>
          </div>
        </div>
        <h1 style={styles.title}>CrickyWorld</h1>
        <p style={styles.tagline}>SCORE · TRACK · WIN</p>
        <p style={styles.subtitle}>Create your account</p>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>🧑 FULL NAME</label>
          <input name="name" type="text" placeholder="Enter your full name"
            value={form.name} onChange={handleChange} style={styles.input}
            onFocus={(e) => (e.target.style.borderColor = "#e63946")}
            onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")} />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>📱 MOBILE NUMBER</label>
          <div style={styles.mobileRow}>
            <div style={styles.dialCode}>IN +91</div>
            <input name="mobile" type="tel" placeholder="Enter mobile number"
              value={form.mobile} onChange={handleChange}
              style={{ ...styles.input, flex: 1 }}
              onFocus={(e) => (e.target.style.borderColor = "#e63946")}
              onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")} />
          </div>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>🔒 PASSWORD</label>
          <div style={styles.passwordWrap}>
            <input name="password" type={showPassword ? "text" : "password"}
              placeholder="Min 6 characters" value={form.password}
              onChange={handleChange}
              style={{ ...styles.input, paddingRight: "44px" }}
              onFocus={(e) => (e.target.style.borderColor = "#e63946")}
              onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")} />
            <button onClick={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>🔒 CONFIRM PASSWORD</label>
          <div style={styles.passwordWrap}>
            <input name="confirmPassword" type={showConfirm ? "text" : "password"}
              placeholder="Repeat your password" value={form.confirmPassword}
              onChange={handleChange}
              style={{ ...styles.input, paddingRight: "44px" }}
              onFocus={(e) => (e.target.style.borderColor = "#e63946")}
              onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")} />
            <button onClick={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
              {showConfirm ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        {error && <p style={styles.errorMsg}>⚠️ {error}</p>}

        <button onClick={handleSubmit} disabled={loading}
          style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
          onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#c1121f"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#e63946"; }}>
          {loading ? "Creating Account..." : "🏏 CREATE ACCOUNT"}
        </button>

        <div style={styles.divider}>
          <span style={styles.dividerLine} />
          <span style={styles.dividerText}>OR</span>
          <span style={styles.dividerLine} />
        </div>

        <p style={styles.footer}>
          Already have an account?{" "}
          <a href="/login" style={styles.link}>Sign in here →</a>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif", padding: "24px" },
  card: { background: "#111111", borderRadius: "20px", padding: "40px 44px", width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column", gap: "16px", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" },
  logoWrap: { display: "flex", justifyContent: "center", marginBottom: "4px" },
  logoCircle: { width: "68px", height: "68px", background: "radial-gradient(circle at 35% 35%, #ff4d4d, #c1121f)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(230,57,70,0.5)" },
  title: { color: "#ffffff", fontSize: "28px", fontWeight: "700", textAlign: "center", margin: 0, letterSpacing: "0.5px" },
  tagline: { color: "#e63946", fontSize: "11px", fontWeight: "700", textAlign: "center", letterSpacing: "3px", margin: "0 0 2px" },
  subtitle: { color: "#aaaaaa", fontSize: "13px", textAlign: "center", margin: "0 0 8px" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { color: "#aaaaaa", fontSize: "11px", fontWeight: "600", letterSpacing: "1.5px" },
  input: { background: "#1a1a1a", border: "1.5px solid #2a2a2a", borderRadius: "10px", color: "#ffffff", fontSize: "14px", padding: "12px 14px", outline: "none", width: "100%", boxSizing: "border-box", transition: "border-color 0.2s" },
  mobileRow: { display: "flex", gap: "8px", alignItems: "center" },
  dialCode: { background: "#1a1a1a", border: "1.5px solid #2a2a2a", borderRadius: "10px", color: "#ffffff", fontSize: "13px", fontWeight: "600", padding: "12px 14px", whiteSpace: "nowrap", flexShrink: 0 },
  passwordWrap: { position: "relative" },
  eyeBtn: { position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "16px", opacity: 0.6, padding: 0 },
  errorMsg: { color: "#ff6b6b", fontSize: "13px", background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.3)", borderRadius: "8px", padding: "10px 14px", margin: 0 },
  submitBtn: { background: "#e63946", color: "#ffffff", border: "none", borderRadius: "10px", padding: "14px", fontSize: "14px", fontWeight: "700", letterSpacing: "1px", transition: "background 0.2s", marginTop: "4px", width: "100%" },
  divider: { display: "flex", alignItems: "center", gap: "12px" },
  dividerLine: { flex: 1, height: "1px", background: "#2a2a2a", display: "block" },
  dividerText: { color: "#555555", fontSize: "12px", fontWeight: "600", letterSpacing: "1px" },
  footer: { color: "#777777", fontSize: "13px", textAlign: "center", margin: 0 },
  link: { color: "#e63946", textDecoration: "none", fontWeight: "600" },
};