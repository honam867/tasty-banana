import { io, Socket } from "socket.io-client";

const NEXT_PUBLIC_SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL;

let socket: Socket | null = null;

export function initializeSocket(): Socket {
  if (!socket) {
    socket = io(NEXT_PUBLIC_SERVER_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      console.log("[Socket] ✅ Connected successfully! Socket ID:", socket?.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] ❌ Disconnected. Reason:", reason);
    });

    socket.on("connect_error", (error) => {
      console.error("[Socket] ❌ Connection error:", error.message);
      console.error("[Socket] Full error:", error);
    });

    socket.on("error", (error) => {
      console.error("[Socket] ❌ Socket error:", error);
    });
  }

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(): void {
  if (socket) {
    if (!socket.connected) {
      socket.connect();
    } else {
      console.log("[Socket] Already connected");
    }
  } else {
    console.error("[Socket] Cannot connect - socket not initialized");
  }
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}

export function joinThread(threadId: string): void {
  if (socket?.connected) {
    socket.emit("join-thread", threadId);
  }
}

export function leaveThread(threadId: string): void {
  if (socket?.connected) {
    socket.emit("leave-thread", threadId);
  }
}
