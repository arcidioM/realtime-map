import React, { useState, useEffect, useRef } from 'react';
import MapWrapper from './components/MapWrapper';
import UserList from './components/UserList';
import LocationStatus from './components/LocationStatus';
import { initSocket, getSocket } from './services/socket';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const mapRef = useRef();

  useEffect(() => {
    const socket = initSocket();

    // OBTER LOCALIZAÇÃO COM MÁXIMA PRECISÃO
    if (navigator.geolocation) {
      console.log('📱 Solicitando localização com máxima precisão...');
      
      // Primeira tentativa com configurações agressivas
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // Dados de localização com alta precisão
            const userLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              altitudeAccuracy: position.coords.altitudeAccuracy,
              heading: position.coords.heading,
              speed: position.coords.speed,
              timestamp: position.timestamp
            };
            
            console.log('📍 LOCALIZAÇÃO DE ALTA PRECISÃO:', {
              latitude: userLocation.lat,
              longitude: userLocation.lng,
              precisao: userLocation.accuracy.toFixed(1) + ' metros',
              altitude: userLocation.altitude || 'N/A'
            });
            
            // Se a precisão for maior que 50 metros, tentar novamente
            if (position.coords.accuracy > 50) {
              console.log('⚠️ Precisão baixa, tentando obter localização mais precisa...');
              setTimeout(() => {
                navigator.geolocation.getCurrentPosition(
                  (betterPosition) => {
                    processLocation(betterPosition);
                  },
                  null,
                  { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                );
              }, 1000);
            } else {
              processLocation(position);
            }
            
          } catch (err) {
            console.error('❌ Erro:', err);
            setError('Erro ao processar localização');
            setLoading(false);
          }
        },
        (err) => {
          console.error('❌ Erro de geolocalização:', err);
          
          // Mensagens de erro amigáveis
          let errorMessage = '';
          switch(err.code) {
            case 1:
              errorMessage = 'Permissão de localização negada. Por favor, permita o acesso à localização.';
              break;
            case 2:
              errorMessage = 'Posição indisponível. Verifique se o GPS está ativo.';
              break;
            case 3:
              errorMessage = 'Tempo excedido ao obter localização. Tente novamente.';
              break;
            default:
              errorMessage = 'Erro ao obter localização: ' + err.message;
          }
          
          setError(errorMessage);
          setLoading(false);
        },
        { 
          enableHighAccuracy: true,      // ← Forçar GPS
          timeout: 15000,                 // ← 15 segundos de timeout
          maximumAge: 0                    // ← Não usar cache
        }
      );
    } else {
      setError('Geolocalização não é suportada neste navegador');
      setLoading(false);
    }

    // Função para processar localização
    async function processLocation(position) {
      try {
        const userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        
        // Obter IP real
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        
        const userData = {
          id: getSocket().id,
          ip: data.ip,
          location: userLocation,
          lastUpdate: new Date().toISOString()
        };
        
        setCurrentUser(userData);
        getSocket().emit('user-location', userData);
        setLoading(false);
        
      } catch (err) {
        console.error('Erro ao obter IP:', err);
        setError('Erro ao obter dados');
        setLoading(false);
      }
    }

    // Listeners do socket
    socket.on('initial-users', (users) => {
      console.log('📥 Utilizadores online:', users.length);
      setConnectedUsers(users.filter(u => u.id !== socket.id));
    });

    socket.on('user-connected', (user) => {
      console.log('➕ Novo utilizador conectado');
      setConnectedUsers(prev => [...prev, user]);
    });

    socket.on('user-disconnected', (userId) => {
      console.log('➖ Utilizador desconectado');
      setConnectedUsers(prev => prev.filter(u => u.id !== userId));
    });

    socket.on('location-updated', ({ id, location }) => {
      console.log('🔄 Localização actualizada');
      setConnectedUsers(prev => 
        prev.map(u => 
          u.id === id 
            ? { ...u, location, lastUpdate: new Date().toISOString() }
            : u
        )
      );
    });

    return () => {
      socket.off('initial-users');
      socket.off('user-connected');
      socket.off('user-disconnected');
      socket.off('location-updated');
    };
  }, []);

  const handleViewOnMap = (userId) => {
    if (mapRef.current) {
      mapRef.current.flyToUser(userId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">A obter localização de alta precisão...</p>
          <p className="text-xs text-gray-400 mt-2">Por favor, permita o acesso ao GPS</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-md">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Erro</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Mapa em Tempo Real</h1>
            <p className="text-sm text-blue-100">
              {connectedUsers.length} utilizador{connectedUsers.length !== 1 ? 'es' : ''} online
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-blue-200">Precisão:</p>
            <p className="text-sm font-mono">
              {currentUser?.location?.accuracy?.toFixed(1)} metros
            </p>
          </div>
        </div>
      </header>
      
      <div className="flex-1 flex flex-col md:flex-row">
        <div className="md:w-3/4 h-[50vh] md:h-full">
          <MapWrapper 
            ref={mapRef}
            currentUser={currentUser}
            connectedUsers={connectedUsers}
          />
        </div>
        
        <div className="md:w-1/4 bg-gray-50 p-4 overflow-y-auto border-l border-gray-200">
          <LocationStatus currentUser={currentUser} />
          <UserList 
            currentUser={currentUser}
            connectedUsers={connectedUsers}
            onViewOnMap={handleViewOnMap}
          />
        </div>
      </div>
    </div>
  );
}

export default App;