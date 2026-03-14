import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const logout = async () => {
    try {
      await api.post("/auth/logout.php");
    } catch (e) {
      console.error(e);
    }
    setUser(null);
    navigate("/login");
  };

  return (
    <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
      <div className="font-semibold">固定費管理システム</div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{user?.name}</span>

        <button
          onClick={logout}
          className="text-sm text-red-500 hover:underline"
        >
          ログアウト
        </button>
      </div>
    </header>
  );
}
