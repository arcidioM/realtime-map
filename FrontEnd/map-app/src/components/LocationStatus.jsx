import React, { useState, useEffect, useRef } from 'react';
import { getSocket } from '../services/socket';

function LocationStatus({ currentUser }) {
  const [lastUpdate, setLastUpdate] = useState(null);
  const [accuracy, setAccuracy] = useState(currentUser?.location?.accuracy || null);
  const watchIdRef = useRef(null);

  useEffect(() => {
    if (!currentUser || watchIdRef.current !== null) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setAccuracy(position.coords.accuracy);
        setLastUpdate(new Date());
        getSocket().emit('update-location', newLocation);
      },
      (err) => console.error('❌ watchPosition error:', err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [currentUser]);

  if (!currentUser) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4 border border-blue-100">
      <h3 className="text-lg font-semibold mb-3 text-blue-800 flex items-center">
        <span className="w-3 h-3 bg-blue-500 rounded-full mr-2 animate-pulse inline-block"></span>
        Minha Localização Real
      </h3>

      <div className="space-y-3">
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-gray-600">Latitude:</div>
            <div className="font-mono font-medium text-blue-700">
              {currentUser.location?.lat?.toFixed(6)}
            </div>

            <div className="text-gray-600">Longitude:</div>
            <div className="font-mono font-medium text-blue-700">
              {currentUser.location?.lng?.toFixed(6)}
            </div>

            <div className="text-gray-600">IP:</div>
            <div className="font-mono text-gray-800 text-xs break-all">{currentUser.ip}</div>

            <div className="text-gray-600">Precisão:</div>
            <div className="text-green-600">
              {accuracy ? `${accuracy.toFixed(1)} metros` : 'Alta'}
            </div>
          </div>
        </div>

        {lastUpdate && (
          <div className="text-xs text-gray-500 flex items-center justify-between">
            <span>Última actualização:</span>
            <span className="font-mono">{lastUpdate.toLocaleTimeString()}</span>
          </div>
        )}

        <div className="text-xs text-green-600 flex items-center">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse inline-block"></span>
          Atualizando em tempo real...
        </div>
      </div>
    </div>
  );
}

export default LocationStatus;