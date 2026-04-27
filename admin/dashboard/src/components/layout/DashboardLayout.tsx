'use client';

import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Truck, 
  AlertTriangle, 
  Settings, 
  LogOut,
  Search,
  Bell
} from 'lucide-react';

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex h-screen bg-[#0A0A0A] text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#111111] border-r border-white/5 flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold bg-gradient-to-r from-[#FF4500] to-[#FF8C00] bg-clip-text text-transparent">
            FLUXDROP OPS
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {[
            { icon: LayoutDashboard, label: 'Control Center', active: true },
            { icon: ShoppingBag, label: 'Live Orders' },
            { icon: Truck, label: 'Fleet Status' },
            { icon: AlertTriangle, label: 'Incidents', count: 3 },
            { icon: Settings, label: 'Settings' },
          ].map((item, idx) => (
            <button
              key={idx}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                item.active 
                  ? 'bg-[#FF4500]/10 text-[#FF4500] border border-[#FF4500]/20' 
                  : 'hover:bg-white/5 text-gray-400'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
              {item.count && (
                <span className="ml-auto bg-[#FF4500] text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button className="w-full flex items-center space-x-3 px-4 py-3 text-gray-400 hover:text-white transition-colors">
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-[#111111]/50 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-8">
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Search Orders, Riders, or Restaurants..." 
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-12 pr-4 focus:outline-none focus:border-[#FF4500]/50 transition-all text-sm"
            />
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-xs font-medium border border-green-500/20">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span>Systems Online</span>
            </div>
            <button className="relative text-gray-400 hover:text-white transition-colors">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#FF4500] rounded-full border-2 border-[#0A0A0A]" />
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF4500] to-[#FF8C00] flex items-center justify-center font-bold text-sm">
              AD
            </div>
          </div>
        </header>

        {/* Content Area */}
        <section className="flex-1 overflow-y-auto p-8">
          {children}
        </section>
      </main>
    </div>
  );
};
