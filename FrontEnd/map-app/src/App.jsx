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

    async function processLocation(position) {
      try {
        const userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        let ip = 'N/A';
        try {
          const res = await fetch('https://api.ipify.org?format=json');
          const data = await res.json();
          ip = data.ip;
        } catch {
          console.warn('⚠️ Não foi possível obter IP');
        }

        const userData = {
          id: getSocket().id,
          ip,
          location: userLocation,
          lastUpdate: new Date().toISOString(),
        };

        setCurrentUser(userData);
        getSocket().emit('user-location', userData);
        setLoading(false);
      } catch (err) {
        console.error('❌ Erro:', err);
        setError('Erro ao processar localização');
        setLoading(false);
      }
    }

    if (!navigator.geolocation) {
      setError('Geolocalização não suportada neste browser.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (position.coords.accuracy > 500) {
          navigator.geolocation.getCurrentPosition(
            (better) => processLocation(better),
            () => processLocation(position),
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
          );
        } else {
          processLocation(position);
        }
      },
      (err) => {
        const msgs = {
          1: 'Permissão de localização negada. Permite o acesso nas definições do browser.',
          2: 'Posição indisponível. Verifica se o GPS está ativo.',
          3: 'Tempo esgotado. Tenta novamente.',
        };
        setError(msgs[err.code] || 'Erro: ' + err.message);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    socket.on('initial-users', (users) => {
      setConnectedUsers(users.filter((u) => u.id !== socket.id));
    });
    socket.on('user-connected', (user) => {
      setConnectedUsers((prev) =>
        prev.find((u) => u.id === user.id) ? prev : [...prev, user]
      );
    });
    socket.on('user-disconnected', (userId) => {
      setConnectedUsers((prev) => prev.filter((u) => u.id !== userId));
    });
    socket.on('location-updated', ({ id, location }) => {
      setConnectedUsers((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, location, lastUpdate: new Date().toISOString() } : u
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

  const handleViewOnMap = (userId) => mapRef.current?.flyToUser(userId);

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

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="md:w-3/4 h-[50vh] md:h-full">
          <MapWrapper ref={mapRef} currentUser={currentUser} connectedUsers={connectedUsers} />
        </div>
        <div className="md:w-1/4 bg-gray-50 p-4 overflow-y-auto border-l border-gray-200">
          <LocationStatus currentUser={currentUser} />
          <UserList currentUser={currentUser} connectedUsers={connectedUsers} onViewOnMap={handleViewOnMap} />
        </div>
      </div>
    </div>
  );
}

export default App;