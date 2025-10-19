"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Socket } from "socket.io-client";
import { initializeSocket, connectSocket, disconnectSocket, getSocket } from "@/lib/socket";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketInstance = initializeSocket();
    setSocket(socketInstance);

    connectSocket();

    socketInstance.on("connect", () => {
      console.log("[SocketProvider] Connected to server");
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      console.log("[SocketProvider] Disconnected from server");
      setIsConnected(false);
    });

    socketInstance.on("connect_error", (error) => {
      console.error("[SocketProvider] Connection error:", error);
    });

    return () => {
      disconnectSocket();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}
