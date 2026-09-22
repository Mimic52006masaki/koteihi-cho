import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { GoogleLogin } from "@react-oauth/google";

const googleEnabled = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

// サーバーが返したメッセージを優先し、無ければ既定文言にする
const messageFrom = (err: unknown, fallback: string) => {
  const res = (err as { response?: { data?: { error?: string } } })?.response;
  return res?.data?.error || fallback;
};

function Login() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const afterLogin = async () => {
    const me = await api.get("/auth/me.php");
    setUser(me.data.data);
    navigate("/dashboard");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login.php", { email, password });

      if (res.data.success) {
        await afterLogin();
      } else {
        setError(res.data.error || "ログイン失敗");
      }
    } catch (err) {
      // 認証失敗は 401 で返るため、サーバーのメッセージを拾う
      setError(messageFrom(err, "サーバーエラーが発生しました"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async (credential?: string) => {
    if (!credential) {
      setError("Googleログインに失敗しました");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/google.php", { credential });

      if (res.data.success) {
        await afterLogin();
      } else {
        setError(res.data.error || "Googleログインに失敗しました");
      }
    } catch (err) {
      setError(messageFrom(err, "Googleログインに失敗しました"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md"
      >
        <h2 className="text-2xl font-bold mb-6 text-center">ログイン</h2>

        {error && (
          <div className="bg-red-100 text-red-600 p-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}
        <div className="mb-4">
          <label className="block text-sm mb-1">メールアドレス</label>
          <input
            type="email"
            className="w-full border rounded px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm mb-1">パスワード</label>
          <input
            type="password"
            className="w-full border rounded px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded transition"
        >
          {loading ? "ログイン中..." : "ログイン"}
        </button>

        {googleEnabled && (
          <>
            <div className="flex items-center gap-3 my-6">
              <span className="h-px flex-1 bg-gray-200" />
              <span className="text-xs text-gray-400">または</span>
              <span className="h-px flex-1 bg-gray-200" />
            </div>

            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={(res) => handleGoogle(res.credential)}
                onError={() => setError("Googleログインに失敗しました")}
                useOneTap={false}
              />
            </div>
          </>
        )}

      </form>
    </div>
  );
}

export default Login;
