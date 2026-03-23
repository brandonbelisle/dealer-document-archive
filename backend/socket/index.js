// socket/index.js
// WebSocket service for real-time updates
let io = null;

function init(socketIo) {
  io = socketIo;
  
  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);
    
    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });
  
  return io;
}

function getIO() {
  return io;
}

// Emit to all connected clients
function broadcast(event, data) {
  if (io) {
    io.emit(event, data);
  }
}

// Location events
function locationsChanged() {
  broadcast('locations:changed', { timestamp: Date.now() });
}

// Department events
function departmentsChanged(locationId) {
  broadcast('departments:changed', { locationId, timestamp: Date.now() });
}

// Folder events
function foldersChanged(departmentId) {
  broadcast('folders:changed', { departmentId, timestamp: Date.now() });
}

// File events
function filesChanged(folderId) {
  broadcast('files:changed', { folderId, timestamp: Date.now() });
}

// User events
function usersChanged() {
  broadcast('users:changed', { timestamp: Date.now() });
}

// Group events
function groupsChanged() {
  broadcast('groups:changed', { timestamp: Date.now() });
}

// Settings events
function settingsChanged() {
  broadcast('settings:changed', { timestamp: Date.now() });
}

// DMS events
function dmsScheduleChanged() {
  broadcast('dms:schedule', { timestamp: Date.now() });
}

// Notification events - emit to specific user
function notificationCreated(userId, notification) {
  if (io) {
    io.emit('notification:created', { userId, notification, timestamp: Date.now() });
  }
}

// Notification count update for specific user
function notificationCountUpdated(userId, count) {
  if (io) {
    io.emit('notification:count', { userId, count, timestamp: Date.now() });
  }
}

// CHT inquiry events
function chtInquiriesChanged() {
  broadcast('cht:inquiries:changed', { timestamp: Date.now() });
}

module.exports = {
  init,
  getIO,
  broadcast,
  locationsChanged,
  departmentsChanged,
  foldersChanged,
  filesChanged,
  usersChanged,
  groupsChanged,
  settingsChanged,
  dmsScheduleChanged,
  notificationCreated,
  notificationCountUpdated,
  chtInquiriesChanged,
};