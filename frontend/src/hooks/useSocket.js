// hooks/useSocket.js
// Socket.io connection hook for real-time updates
import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

let socket = null;

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
  const reconnectTimeoutRef = useRef(null);
  
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
  
  // Keep handlers up to date
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

    // Location events
    socket.on('locations:changed', () => {
      handlersRef.current.onLocationsChanged?.();
    });

    // Department events
    socket.on('departments:changed', (data) => {
      handlersRef.current.onDepartmentsChanged?.(data?.locationId);
    });

    // Folder events
    socket.on('folders:changed', (data) => {
      handlersRef.current.onFoldersChanged?.(data?.departmentId);
    });

    // File events
    socket.on('files:changed', (data) => {
      handlersRef.current.onFilesChanged?.(data?.folderId);
    });

    // User events
    socket.on('users:changed', () => {
      handlersRef.current.onUsersChanged?.();
    });

    // Group events
    socket.on('groups:changed', () => {
      handlersRef.current.onGroupsChanged?.();
    });

    // Settings events
    socket.on('settings:changed', () => {
      handlersRef.current.onSettingsChanged?.();
    });

    // DMS schedule events
    socket.on('dms:schedule', () => {
      handlersRef.current.onDmsScheduleChanged?.();
    });

    // Notification events
    socket.on('notification:created', (data) => {
      handlersRef.current.onNotificationCreated?.(data);
    });

    // CHT inquiry events
    socket.on('cht:inquiries:changed', () => {
      handlersRef.current.onChtInquiriesChanged?.();
    });
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
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