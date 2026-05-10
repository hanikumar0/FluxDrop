import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

export const useTracking = (deliveryId: string) => {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io('http://localhost:3005/tracking', {
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('Connected to tracking server');
      newSocket.emit('joinRoom', { deliveryId });
    });

    newSocket.on('locationUpdated', (data) => {
      setLocation(data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [deliveryId]);

  return { location, socket };
};
