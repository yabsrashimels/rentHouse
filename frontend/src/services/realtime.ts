import { io, type Socket } from 'socket.io-client'

const apiUrl = import.meta.env.VITE_API_URL || '/api'
const socketUrl = import.meta.env.VITE_SOCKET_URL || (apiUrl.startsWith('http') ? apiUrl.replace(/\/api\/?$/, '') : undefined)

let socket: Socket | undefined

export function getRealtimeSocket() {
  if (!socket) {
    socket = io(socketUrl, {
      withCredentials: true,
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
    })
  }
  return socket
}