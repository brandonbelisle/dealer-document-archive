// hooks/useSocket.js
// Socket.io connection hook for real-time updates
import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

let socket = null;
let connectionCount = 0;

export function useSocket({
  onLocationsChanged,
  onDepartmentsChanged,
  onFoldersChanged,
  onFilesChanged,
  onUsersChanged,
  onGroupsChanged,
  onSettingsChanged,
  onDmsScheduleChanged,
  onNotificationCreated,
  onChtInquiriesChanged,
}) {
  const handlersRef = useRef({
    onLocationsChanged,
    onDepartmentsChanged,
    onFoldersChanged,
    onFilesChanged,
    onUsersChanged,
    onGroupsChanged,
    onSettingsChanged,
    onDmsScheduleChanged,
    onNotificationCreated,
    onChtInquiriesChanged,
  });
  
  useEffect(() => {
    handlersRef.current = {
      onLocationsChanged,
      onDepartmentsChanged,
      onFoldersChanged,
      onFilesChanged,
      onUsersChanged,
      onGroupsChanged,
      onSettingsChanged,
      onDmsScheduleChanged,
      onNotificationCreated,
      onChtInquiriesChanged,
    };
  });

  const connect = useCallback(() => {
    if (socket?.connected) return;
    
    const apiUrl = window.location.origin;
    socket = io(apiUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.log('[Socket] Connection error:', err.message);
    });
  }, []);

  useEffect(() => {
    connect();
    connectionCount++;

    const handleLocationsChanged = () => handlersRef.current.onLocationsChanged?.();
    const handleDepartmentsChanged = (data) => handlersRef.current.onDepartmentsChanged?.(data?.locationId);
    const handleFoldersChanged = (data) => handlersRef.current.onFoldersChanged?.(data?.departmentId);
    const handleFilesChanged = (data) => handlersRef.current.onFilesChanged?.(data?.folderId);
    const handleUsersChanged = () => handlersRef.current.onUsersChanged?.();
    const handleGroupsChanged = () => handlersRef.current.onGroupsChanged?.();
    const handleSettingsChanged = () => handlersRef.current.onSettingsChanged?.();
    const handleDmsScheduleChanged = () => handlersRef.current.onDmsScheduleChanged?.();
    const handleNotificationCreated = (data) => handlersRef.current.onNotificationCreated?.(data);
    const handleChtInquiriesChanged = () => handlersRef.current.onChtInquiriesChanged?.();

    socket.on('locations:changed', handleLocationsChanged);
    socket.on('departments:changed', handleDepartmentsChanged);
    socket.on('folders:changed', handleFoldersChanged);
    socket.on('files:changed', handleFilesChanged);
    socket.on('users:changed', handleUsersChanged);
    socket.on('groups:changed', handleGroupsChanged);
    socket.on('settings:changed', handleSettingsChanged);
    socket.on('dms:schedule', handleDmsScheduleChanged);
    socket.on('notification:created', handleNotificationCreated);
    socket.on('cht:inquiries:changed', handleChtInquiriesChanged);

    return () => {
      connectionCount--;
      if (socket) {
        socket.off('locations:changed', handleLocationsChanged);
        socket.off('departments:changed', handleDepartmentsChanged);
        socket.off('folders:changed', handleFoldersChanged);
        socket.off('files:changed', handleFilesChanged);
        socket.off('users:changed', handleUsersChanged);
        socket.off('groups:changed', handleGroupsChanged);
        socket.off('settings:changed', handleSettingsChanged);
        socket.off('dms:schedule', handleDmsScheduleChanged);
        socket.off('notification:created', handleNotificationCreated);
        socket.off('cht:inquiries:changed', handleChtInquiriesChanged);
        
        if (connectionCount === 0) {
          socket.disconnect();
          socket = null;
        }
      }
    };
  }, [connect]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  }, []);

  return { disconnect };
}

export function getSocket() {
  return socket;
}