'use client';

import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const data = [
  { time: '10:00', revenue: 4000 },
  { time: '11:00', revenue: 3000 },
  { time: '12:00', revenue: 2000 },
  { time: '13:00', revenue: 2780 },
  { time: '14:00', revenue: 1890 },
  { time: '15:00', revenue: 2390 },
  { time: '16:00', revenue: 3490 },
];

export const RevenueChart = () => {
  return (
    <div className="h-[300px] w-full bg-[#111111] p-6 rounded-2xl border border-white/5">
      <h3 className="text-white text-sm font-semibold mb-6">Revenue Growth (Hourly)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FF4500" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#FF4500" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
          <XAxis 
            dataKey="time" 
            stroke="#ffffff50" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
          />
          <YAxis 
            stroke="#ffffff50" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            tickFormatter={(value: number) => `$${value}`}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#111111', border: '1px solid rgba(255,255,255,0.1)' }}
            itemStyle={{ color: '#FF4500' }}
          />
          <Area 
            type="monotone" 
            dataKey="revenue" 
            stroke="#FF4500" 
            fillOpacity={1} 
            fill="url(#colorRevenue)" 
            strokeWidth={3}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
