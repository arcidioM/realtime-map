import { io } from 'socket.io-client';

const SOCKET_URL = 'https://realtime-map-backend.onrender.com';
let socket = null;

export const initSocket = () => {
  if (!socket) {
    console.log('🔌 Inicializando socket...');
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'], // ✅ polling como fallback para mobile
      reconnection: true,
      reconnectionAttempts: 10,            // ✅ mais tentativas
      reconnectionDelay: 2000,
      timeout: 30000,                       // ✅ 30 segundos de timeout
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