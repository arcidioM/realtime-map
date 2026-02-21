import { Server } from 'socket.io';
import http from 'http';
import express from 'express';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Armazenar usuários conectados
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('✅ Novo utilizador conectado:', socket.id);
  
  // Enviar lista de utilizadores já conectados
  const usersList = [];
  connectedUsers.forEach((user, id) => {
    usersList.push({
      id: id,
      ip: user.ip,
      location: user.location,
      lastUpdate: user.lastUpdate
    });
  });
  
  socket.emit('initial-users', usersList);
  console.log(`📤 Enviando lista com ${usersList.length} utilizadores`);

  // Registar novo utilizador
  socket.on('user-location', (userData) => {
    console.log(`📍 Localização recebida de ${socket.id}:`, userData.location);
    
    const userInfo = {
      ip: userData.ip,
      location: userData.location,
      lastUpdate: new Date().toISOString()
    };
    
    connectedUsers.set(socket.id, userInfo);
    
    // Notificar todos os outros
    socket.broadcast.emit('user-connected', {
      id: socket.id,
      ...userInfo
    });
    
    console.log(`👥 Total utilizadores: ${connectedUsers.size}`);
  });
  
  // Atualizar localização
  socket.on('update-location', (location) => {
    if (connectedUsers.has(socket.id)) {
      const user = connectedUsers.get(socket.id);
      user.location = location;
      user.lastUpdate = new Date().toISOString();
      connectedUsers.set(socket.id, user);
      
      // Broadcast da atualização
      socket.broadcast.emit('location-updated', {
        id: socket.id,
        location: location
      });
    }
  });
  
  // Desconexão
  socket.on('disconnect', () => {
    if (connectedUsers.has(socket.id)) {
      connectedUsers.delete(socket.id);
      io.emit('user-disconnected', socket.id);
      console.log(`❌ Utilizador desconectado: ${socket.id}`);
      console.log(`👥 Restantes: ${connectedUsers.size}`);
    }
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});