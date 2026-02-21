import React, { useState, useMemo } from 'react';

function UserList({ currentUser, connectedUsers = [], onViewOnMap }) {
  const [expandedUser, setExpandedUser] = useState(null);

  const handleUserClick = (userId) => {
    setExpandedUser(expandedUser === userId ? null : userId);
  };

  const handleViewOnMap = (e, userId) => {
    e.stopPropagation(); // Não expandir o item
    if (onViewOnMap) {
      onViewOnMap(userId);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">
        Outros Utilizadores Conectados ({connectedUsers.length})
      </h3>
      
      {connectedUsers.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">
          Nenhum outro utilizador conectado no momento
        </p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {connectedUsers.map((user) => (
            <div 
              key={user.id} 
              className="border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div 
                className="flex items-center justify-between p-3 cursor-pointer bg-gray-50 rounded-t-lg"
                onClick={() => handleUserClick(user.id)}
              >
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="font-medium text-gray-700">
                    Utilizador {user.ip?.split('.').pop() || user.id.substring(0, 6)}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {expandedUser === user.id ? '▼' : '▶'}
                </span>
              </div>
              
              {expandedUser === user.id && user.location && (
                <div className="p-3 text-sm space-y-2 bg-white rounded-b-lg">
                  <div className="grid grid-cols-2 gap-1">
                    <span className="text-gray-600">IP:</span>
                    <span className="font-mono text-gray-800">{user.ip}</span>
                    
                    <span className="text-gray-600">Latitude:</span>
                    <span className="font-mono text-gray-800">
                      {user.location.lat?.toFixed(6)}
                    </span>
                    
                    <span className="text-gray-600">Longitude:</span>
                    <span className="font-mono text-gray-800">
                      {user.location.lng?.toFixed(6)}
                    </span>
                    
                    <span className="text-gray-600">Atualizado:</span>
                    <span className="text-xs text-gray-500">
                      {user.lastUpdate 
                        ? new Date(user.lastUpdate).toLocaleTimeString()
                        : 'Agora mesmo'}
                    </span>
                  </div>
                  
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <button 
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                      onClick={(e) => handleViewOnMap(e, user.id)}
                    >
                      <span>Ver no mapa</span>
                      <span className="ml-1">→</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default UserList;