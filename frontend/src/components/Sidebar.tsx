import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const location = useLocation();

  const menu = [
    { name: "Dashboard", path: "/dashboard" },
    { name: "今月固定費", path: "/monthly/current" },
    { name: "固定費管理", path: "/fixed-costs" },
    { name: "履歴", path: "/history" },
    { name: "設定", path: "/settings" },
  ];

  return (
    <aside className="w-64 bg-white border-r">
      <div className="p-6 font-bold text-xl border-b">固定費帳</div>

      <nav className="p-4 space-y-2">
        {menu.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`block px-4 py-2 rounded-lg ${
              location.pathname === item.path ||
              location.pathname.startsWith(item.path + "/")
                ? "bg-blue-500 text-white"
                : "hover:bg-gray-100"
            }`}
          >
            {item.name}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
