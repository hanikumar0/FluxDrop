'use client';

import React from 'react';
import { useOpsStore } from '@/store/opsStore';
import { Clock, MapPin, DollarSign, ExternalLink } from 'lucide-react';

export const LiveOrderFeed: React.FC = () => {
  const { activeOrders } = useOpsStore();

  return (
    <div className="bg-[#111111] border border-white/5 rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center space-x-2">
          <Clock className="text-[#FF4500]" size={20} />
          <span>Live Order Feed</span>
        </h2>
        <div className="text-xs text-gray-500 font-medium">
          Last updated: Just now
        </div>
      </div>

      <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
        {activeOrders.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p>No active orders currently monitoring.</p>
            <p className="text-xs mt-1">Orders will appear here in real-time.</p>
          </div>
        ) : (
          activeOrders.map((order) => (
            <div key={order.id} className="p-4 hover:bg-white/[0.02] transition-colors group">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-sm text-[#FF4500]">#{order.orderId.slice(0, 8)}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      order.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                      order.status === 'ASSIGNED' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                      'bg-green-500/10 text-green-500 border-green-500/20'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium mt-1">{order.restaurantName}</h3>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-white flex items-center justify-end space-x-1">
                    <DollarSign size={14} className="text-gray-400" />
                    <span>{order.amount.toFixed(2)}</span>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">{order.timestamp}</div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-4">
                  <button className="text-gray-400 hover:text-white transition-colors">
                    <MapPin size={16} />
                  </button>
                  <button className="text-gray-400 hover:text-white transition-colors">
                    <ExternalLink size={16} />
                  </button>
                </div>
                <button className="bg-white/5 hover:bg-white/10 text-xs px-3 py-1.5 rounded-lg transition-all border border-white/10">
                  Inspect Lifecycle
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
