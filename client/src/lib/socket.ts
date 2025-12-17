import { io, Socket } from "socket.io-client";

const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const wsUrl = `${protocol}//${window.location.host}`;

export const socket: Socket = io(wsUrl, {
  path: "/ws",
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

// Connection event handlers
socket.on("connect", () => {
  console.log("WebSocket connected:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("WebSocket disconnected:", reason);
});

socket.on("connect_error", (error) => {
  console.error("WebSocket connection error:", error);
});

export default socket;
