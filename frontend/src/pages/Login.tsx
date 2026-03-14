import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {api} from "../api/client";

function Login() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login.php", {
        email,
        password,
      });

      if (res.data.success) {

        // user取得
        const me = await api.get("/auth/me.php");
        setUser(me.data.user);

        navigate("/dashboard");
        
      } else {
        setError(res.data.error || "ログイン失敗");
      }
    } catch (err: any) {
      setError("サーバーエラーが発生しました");
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
      </form>
    </div>
  );
}

export default Login;
