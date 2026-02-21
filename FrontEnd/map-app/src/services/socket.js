import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001';
let socket = null;

export const initSocket = () => {
  if (!socket) {
    console.log('🔌 Inicializando socket...');
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    socket.on('connect', () => {
      console.log('✅ Conectado ao servidor WebSocket');
    });
    
    socket.on('connect_error', (error) => {
      console.error('❌ Erro na conexão WebSocket:', error);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Desconectado do servidor:', reason);
    });
  }
  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initSocket();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};