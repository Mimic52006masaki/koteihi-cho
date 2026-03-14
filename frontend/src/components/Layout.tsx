import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar />

      {/* Main */}
      <div className="flex flex-col flex-1">

        {/* Header */}
        <Header />

        {/* Content */}
        <main className="flex-1 p-6">
            <Outlet />
        </main>
      </div>
    </div>
  );
}
