import { io, type Socket } from "socket.io-client";
import { API_ORIGIN } from "./config";

let socket: Socket | null = null;
let tokenInUse = "";

/** One shared Socket.IO connection for the signed-in user. Reconnects when the token changes. */
export function getSocket(): Socket | null {
  const token = localStorage.getItem("sg_token") || "";
  if (!token) {
    closeSocket();
    return null;
  }
  if (socket && tokenInUse === token) return socket;
  socket?.disconnect();
  tokenInUse = token;
  socket = io(API_ORIGIN || undefined, { path: "/socket.io", auth: { token }, transports: ["websocket", "polling"], reconnectionDelayMax: 8000 });
  return socket;
}

export function closeSocket() {
  socket?.disconnect();
  socket = null;
  tokenInUse = "";
}
