import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createCustomIcon = (isCurrentUser) => {
  const size = isCurrentUser ? 30 : 26;
  const color = isCurrentUser ? '#3b82f6' : '#ef4444';
  const pulse = isCurrentUser
    ? `<style>.pulse-me{animation:pmAnim 2s infinite}@keyframes pmAnim{0%,100%{transform:scale(1)}50%{transform:scale(1.25)}}</style>`
    : '';
  const cls = isCurrentUser ? 'class="pulse-me"' : '';

  return L.divIcon({
    className: '',
    html: `${pulse}<div ${cls} style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2)],
  });
};

const buildPopup = (isCurrentUser, userData) => {
  const { lat, lng, accuracy } = userData.location;
  return `
    <div style="padding:8px;min-width:210px;font-family:sans-serif;">
      <strong style="color:${isCurrentUser ? '#3b82f6' : '#ef4444'};font-size:14px;">
        ${isCurrentUser ? '📍 VOCÊ' : '👤 UTILIZADOR'}
        ${userData.deviceType === 'mobile' ? ' 📱' : ' 💻'}
      </strong>
      <hr style="margin:8px 0;border-color:#eee;">
      <div style="font-size:12px;line-height:1.9;">
        <div><strong>IP:</strong> <span style="font-family:monospace;">${userData.ip || 'N/A'}</span></div>
        <div><strong>Latitude:</strong> <span style="font-family:monospace;">${lat.toFixed(6)}</span></div>
        <div><strong>Longitude:</strong> <span style="font-family:monospace;">${lng.toFixed(6)}</span></div>
        ${accuracy ? `<div><strong>Precisão:</strong> <span style="font-family:monospace;">±${accuracy.toFixed(0)} m</span></div>` : ''}
        <div><strong>Actualizado:</strong> <span style="font-family:monospace;">${new Date().toLocaleTimeString()}</span></div>
      </div>
    </div>
  `;
};

const MapWrapper = forwardRef(({ currentUser, connectedUsers = [] }, ref) => {
  const mapContainerRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({});
  const [isReady, setIsReady] = useState(false);

  useImperativeHandle(ref, () => ({
    flyToUser: (userId) => {
      if (!mapInstance.current) return;
      const target = userId === 'current'
        ? currentUser
        : connectedUsers.find((u) => u.id === userId);
      if (target?.location) {
        const { lat, lng } = target.location;
        mapInstance.current.flyTo([lat, lng], 16, { duration: 1.5 });
        const markerId = userId === 'current' ? 'current' : userId;
        markersRef.current[markerId]?.openPopup();
      }
    },
  }));

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainerRef.current || mapInstance.current || !currentUser?.location) return;

    const { lat, lng } = currentUser.location;
    mapInstance.current = L.map(mapContainerRef.current).setView([lat, lng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapInstance.current);

    setIsReady(true);

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        markersRef.current = {};
        setIsReady(false);
      }
    };
  }, [currentUser]);

  // Atualizar marcadores
  useEffect(() => {
    if (!mapInstance.current || !isReady || !currentUser?.location) return;

    const upsert = (id, userData, isCurrentUser) => {
      const { lat, lng } = userData.location;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

      if (markersRef.current[id]) {
        markersRef.current[id].setLatLng([lat, lng]);
        markersRef.current[id].setPopupContent(buildPopup(isCurrentUser, userData));
      } else {
        markersRef.current[id] = L.marker([lat, lng], {
          icon: createCustomIcon(isCurrentUser),
        })
          .addTo(mapInstance.current)
          .bindPopup(buildPopup(isCurrentUser, userData));
      }
    };

    upsert('current', currentUser, true);
    connectedUsers.forEach((u) => { if (u?.id && u?.location) upsert(u.id, u, false); });

    // Limpar saídos
    const active = new Set(['current', ...connectedUsers.map((u) => u.id)]);
    Object.keys(markersRef.current).forEach((id) => {
      if (!active.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });
  }, [currentUser, connectedUsers, isReady]);

  if (!currentUser?.location) {
    return (
      <div className="h-full w-full bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Aguardando localização...</p>
      </div>
    );
  }

  return <div ref={mapContainerRef} className="h-full w-full" />;
});

MapWrapper.displayName = 'MapWrapper';
export default MapWrapper;