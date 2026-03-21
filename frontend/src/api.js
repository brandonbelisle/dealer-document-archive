// src/api.js
// API client for the Dealer Document Archive backend
// Import this in App.jsx and use the named exports.

const API_BASE = import.meta.env.VITE_API_URL || '/api';

let authToken = localStorage.getItem('dda_token') || null;

function setToken(token) {
  authToken = token;
  if (token) localStorage.setItem('dda_token', token);
  else localStorage.removeItem('dda_token');
}

function getToken() {
  return authToken;
}

async function request(path, options = {}) {
  const headers = { ...options.headers };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (err) {
    throw new Error(`Network error: ${err.message}`);
  }

  if (res.status === 401) {
    setToken(null);
    window.location.reload();
    throw new Error('Session expired');
  }

  // Handle non-JSON responses (e.g. HTML from catch-all route)
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    // Some endpoints return non-JSON on success (shouldn't happen, but be safe)
    const text = await res.text();
    try { return JSON.parse(text); } catch { throw new Error(`Unexpected response from server`); }
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ── Auth ──────────────────────────────────────────────────
export async function login(username, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setToken(data.token);
  return data.user;
}

export async function register(username, email, password, displayName) {
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password, displayName }),
  });
  setToken(data.token);
  return data.user;
}

export async function getMe() {
  const data = await request('/auth/me');
  return data.user;
}

export function logout() {
  setToken(null);
}

export function isAuthenticated() {
  return !!authToken;
}

export async function changePassword(currentPassword, newPassword) {
  return request('/auth/change-password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function adminSetPassword(userId, newPassword) {
  return request(`/users/${userId}/password`, {
    method: 'PUT',
    body: JSON.stringify({ newPassword }),
  });
}

// ── Dashboard ─────────────────────────────────────────────
export async function getDashboard() {
  return request('/dashboard');
}

// ── Locations ─────────────────────────────────────────────
export async function getLocations() {
  return request('/locations');
}
export async function createLocation(name) {
  return request('/locations', { method: 'POST', body: JSON.stringify({ name }) });
}
export async function updateLocation(id, name) {
  return request(`/locations/${id}`, { method: 'PUT', body: JSON.stringify({ name }) });
}
export async function deleteLocation(id) {
  return request(`/locations/${id}`, { method: 'DELETE' });
}

// ── Departments ───────────────────────────────────────────
export async function getDepartments(locationId) {
  const q = locationId ? `?locationId=${locationId}` : '';
  return request(`/departments${q}`);
}
export async function createDepartment(name, locationId) {
  return request('/departments', { method: 'POST', body: JSON.stringify({ name, locationId }) });
}
export async function updateDepartment(id, name) {
  return request(`/departments/${id}`, { method: 'PUT', body: JSON.stringify({ name }) });
}
export async function deleteDepartment(id) {
  return request(`/departments/${id}`, { method: 'DELETE' });
}

// ── Folders ───────────────────────────────────────────────
export async function getFolders(params = {}) {
  const q = new URLSearchParams();
  if (params.departmentId) q.set('departmentId', params.departmentId);
  if (params.locationId) q.set('locationId', params.locationId);
  if (params.parentId !== undefined) q.set('parentId', params.parentId ?? 'null');
  return request(`/folders?${q}`);
}
export async function getFolder(id) {
  return request(`/folders/${id}`);
}
export async function getFolderStats() {
  return request('/folders/stats');
}
export async function createFolder(name, locationId, departmentId, parentId) {
  return request('/folders', {
    method: 'POST',
    body: JSON.stringify({ name, locationId, departmentId, parentId: parentId || null }),
  });
}
export async function deleteFolder(id) {
  return request(`/folders/${id}`, { method: 'DELETE' });
}

// ── Files ─────────────────────────────────────────────────
export async function getFiles(folderId) {
  const q = folderId ? `?folderId=${folderId}` : '';
  return request(`/files${q}`);
}
export async function getUnsortedFiles() {
  return request('/files?unsorted=true');
}
export async function getFile(id) {
  return request(`/files/${id}`);
}
export async function uploadFile(file, folderId, extractedText, pageCount) {
  const form = new FormData();
  form.append('file', file);
  if (folderId) form.append('folderId', folderId);
  if (extractedText) form.append('extractedText', extractedText);
  if (pageCount) form.append('pageCount', String(pageCount));

  return request('/files/upload', { method: 'POST', body: form });
}
export async function moveFile(id, folderId) {
  return request(`/files/${id}/move`, {
    method: 'PUT',
    body: JSON.stringify({ folderId: folderId || null }),
  });
}
export async function updateFileText(id, extractedText, pageCount) {
  return request(`/files/${id}/text`, {
    method: 'PUT',
    body: JSON.stringify({ extractedText, pageCount }),
  });
}
export async function renameFile(id, name) {
  return request(`/files/${id}/rename`, { method: 'PUT', body: JSON.stringify({ name }) });
}
export async function deleteFile(id) {
  return request(`/files/${id}`, { method: 'DELETE' });
}
export function getFileDownloadUrl(id) {
  return `${API_BASE}/files/${id}/download`;
}
export function getFilePreviewUrl(storagePath) {
  if (!storagePath) return null;
  return storagePath;
}

// ── Groups & Permissions ──────────────────────────────────
export async function getGroups() {
  return request('/groups');
}
export async function getPermissionDefinitions() {
  return request('/groups/permissions');
}
export async function createGroup(name, description, permissions) {
  return request('/groups', {
    method: 'POST',
    body: JSON.stringify({ name, description, permissions }),
  });
}
export async function updateGroup(id, name, description) {
  return request(`/groups/${id}`, { method: 'PUT', body: JSON.stringify({ name, description }) });
}
export async function updateGroupPermissions(id, permissions) {
  return request(`/groups/${id}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({ permissions }),
  });
}
export async function deleteGroup(id) {
  return request(`/groups/${id}`, { method: 'DELETE' });
}

// ── Users (admin) ─────────────────────────────────────────
export async function getUsers() {
  return request('/users');
}
export async function getUser(id) {
  return request(`/users/${id}`);
}
export async function createUser(data) {
  return request('/users', { method: 'POST', body: JSON.stringify(data) });
}
export async function updateUser(id, data) {
  return request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}
export async function updateUserGroups(id, groupIds) {
  return request(`/users/${id}/groups`, { method: 'PUT', body: JSON.stringify({ groupIds }) });
}
export async function updateUserStatus(id, status) {
  return request(`/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
}

// ── Audit Log ─────────────────────────────────────────────
export async function getAuditLog(filters = {}) {
  const q = new URLSearchParams();
  if (filters.action) q.set('action', filters.action);
  if (filters.user) q.set('user', filters.user);
  if (filters.date) q.set('date', filters.date);
  if (filters.limit) q.set('limit', String(filters.limit));
  if (filters.offset) q.set('offset', String(filters.offset));
  return request(`/audit?${q}`);
}
export async function getAuditFilters() {
  return request('/audit/filters');
}

// ── Access Control (Location/Department Group Locks) ──────
export async function getLocationAccess() {
  return request('/access/locations');
}
export async function updateLocationAccess(locationId, groupIds) {
  return request(`/access/locations/${locationId}`, {
    method: 'PUT',
    body: JSON.stringify({ groupIds }),
  });
}
export async function getDepartmentAccess() {
  return request('/access/departments');
}
export async function updateDepartmentAccess(departmentId, groupIds) {
  return request(`/access/departments/${departmentId}`, {
    method: 'PUT',
    body: JSON.stringify({ groupIds }),
  });
}

// ── Global Search ────────────────────────────────────────
export async function globalSearch(query) {
  return request(`/search?q=${encodeURIComponent(query)}`);
}

// ── Subscriptions ────────────────────────────────────────
export async function getSubscriptions() {
  return request('/subscriptions');
}
export async function getSubscriptionsWithDetails() {
  return request('/subscriptions/with-details');
}
export async function createSubscription(subscriptionType, subscriptionId) {
  return request('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({ subscriptionType, subscriptionId }),
  });
}
export async function deleteSubscription(id) {
  return request(`/subscriptions/${id}`, { method: 'DELETE' });
}
export async function checkSubscription(subscriptionType, subscriptionId) {
  return request(`/subscriptions/check?subscriptionType=${subscriptionType}&subscriptionId=${subscriptionId}`);
}

// ── Notifications ─────────────────────────────────────────
export async function getNotifications(unreadOnly = false) {
  return request(`/notifications${unreadOnly ? '?unreadOnly=true' : ''}`);
}
export async function markNotificationRead(id) {
  return request(`/notifications/${id}/read`, { method: 'PUT' });
}
export async function markAllNotificationsRead() {
  return request('/notifications/mark-all-read', { method: 'PUT' });
}
export async function getUnreadNotificationCount() {
  return request('/notifications/unread-count');
}
export async function clearReadNotifications() {
  return request('/notifications', { method: 'DELETE' });
}
