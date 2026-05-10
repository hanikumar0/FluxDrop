import { create } from 'zustand';

interface OrderEvent {
  id: string;
  orderId: string;
  status: string;
  timestamp: string;
  amount: number;
  restaurantName: string;
}

interface OpsState {
  activeOrders: OrderEvent[];
  alerts: string[];
  addOrderEvent: (event: OrderEvent) => void;
  addAlert: (alert: string) => void;
}

export const useOpsStore = create<OpsState>((set) => ({
  activeOrders: [],
  alerts: [],
  addOrderEvent: (event) => set((state) => ({ 
    activeOrders: [event, ...state.activeOrders].slice(0, 50) 
  })),
  addAlert: (alert) => set((state) => ({ 
    alerts: [alert, ...state.alerts].slice(0, 10) 
  })),
}));
