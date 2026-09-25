import { Menu, Bell, Search } from 'lucide-react';

export default function Topbar({ onToggleSidebar, title }) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 lg:px-6 gap-4">
      <button
        onClick={onToggleSidebar}
        className="p-2 rounded-lg hover:bg-slate-100 lg:hidden"
      >
        <Menu className="w-5 h-5" />
      </button>

      <h1 className="text-lg font-semibold text-slate-800 flex-1">{title}</h1>

      <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2 w-72">
        <Search className="w-4 h-4 text-slate-500" />
        <input
          placeholder="Search..."
          className="bg-transparent border-none outline-none text-sm w-full"
        />
      </div>

      <button className="relative p-2 rounded-lg hover:bg-slate-100">
        <Bell className="w-5 h-5 text-slate-600" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
      </button>
    </header>
  );
}