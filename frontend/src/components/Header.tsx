import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Header({ onMenuOpen }: { onMenuOpen?: () => void }) {
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

  const initial = user?.name?.charAt(0)?.toUpperCase() ?? "U";

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm px-4 py-3 flex justify-between items-center">
      <button
        onClick={onMenuOpen}
        className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        aria-label="メニューを開く"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="hidden md:block" />

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold select-none">
            {initial}
          </div>
          <span className="text-sm text-gray-600">{user?.name}</span>
        </div>

        <button
          onClick={logout}
          className="text-sm text-gray-400 hover:text-red-500 transition-colors"
        >
          ログアウト
        </button>
      </div>
    </header>
  );
}
