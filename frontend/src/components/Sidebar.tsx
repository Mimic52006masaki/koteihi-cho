import { memo } from "react";
import { Link, useLocation } from "react-router-dom";

const MENU_ITEMS = [
  { name: "Dashboard", path: "/dashboard" },
  { name: "口座管理", path: "/accounts" },
  { name: "今月固定費", path: "/monthly/current" },
  { name: "固定費管理", path: "/fixed-costs" },
  { name: "履歴", path: "/history" },
  { name: "分析", path: "/analytics" },
  { name: "設定", path: "/settings" },
];

function Sidebar({ open, onClose }: { open?: boolean; onClose?: () => void }) {
  const location = useLocation();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 flex flex-col",
          "transform transition-transform duration-200 ease-in-out",
          "md:static md:translate-x-0 md:shrink-0",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        <div className="px-6 py-5 border-b border-gray-800">
          <span className="text-white font-bold text-xl tracking-tight">固定費帳</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {MENU_ITEMS.map((item) => {
            const isActive =
              location.pathname === item.path ||
              location.pathname.startsWith(item.path + "/");
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={[
                  "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border-l-2",
                  isActive
                    ? "bg-gray-800 text-white border-blue-500"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white border-transparent",
                ].join(" ")}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

export default memo(Sidebar);
