// src/api.js
// API client for the Dealer Document Archive backend
// Supports both httpOnly cookie auth and Authorization header

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getCookieToken() {
  const match = document.cookie.match(/(?:^|;\s*)dda_token=([^;]*)/);
  return match ? match[1] : null;
}

function setCookieToken(token) {
  const maxAge = 24 * 60 * 60; // 24 hours
  document.cookie = `dda_token=${token}; path=/; max-age=${maxAge}; SameSite=Strict${location.protocol === 'https:' ? '; Secure' : ''}`;
}

function clearCookieToken() {
  document.cookie = 'dda_token=; path=/; max-age=0';
}

let authToken = localStorage.getItem('dda_token') ||getCookieToken() || null;

function setToken(token) {
  authToken = token;
  if (token) {
    localStorage.setItem('dda_token', token);
    setCookieToken(token);
  } else {
    localStorage.removeItem('dda_token');
    clearCookieToken();
  }
}

function getToken() {
  return authToken || getCookieToken();
}

async function request(path, options = {}) {
  const headers = { ...options.headers };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });
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
export async function login(email, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (data.token) setToken(data.token);
  return data.user;
}

export async function logout() {
  try {
    await request('/auth/logout', { method: 'POST' });
  } catch {
    // Ignore errors on logout
  }
  setToken(null);
}

export async function register(username, email, password, displayName) {
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password, displayName }),
  });
  // Registration returns user data but not a token (admin creates users now)
  return data.user;
}

export async function getMe() {
  const data = await request('/auth/me');
  return data.user;
}

export function isAuthenticated() {
  return !!(authToken || getCookieToken());
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
export async function createLocation(name, locationCode) {
  return request('/locations', { method: 'POST', body: JSON.stringify({ name, locationCode }) });
}
export async function updateLocation(id, name, locationCode) {
  return request(`/locations/${id}`, { method: 'PUT', body: JSON.stringify({ name, locationCode }) });
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
export async function findFolder(name, locationId, departmentId, parentId) {
  const q = new URLSearchParams({
    name,
    locationId,
    departmentId,
    parentId: parentId || 'null',
  });
  return request(`/folders/find?${q}`, { method: 'GET' });
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
export async function uploadFile(file, folderId, extractedText, pageCount, skipNotification = false) {
  const form = new FormData();
  form.append('file', file);
  if (folderId) form.append('folderId', folderId);
  if (extractedText) form.append('extractedText', extractedText);
  if (pageCount) form.append('pageCount', String(pageCount));
  if (skipNotification) form.append('skipNotification', 'true');

  return request('/files/upload', { method: 'POST', body: form });
}
export async function moveFile(id, folderId) {
  return request(`/files/${id}/move`, {
    method: 'PUT',
    body: JSON.stringify({ folderId: folderId || null }),
  });
}

export async function createBatchUploadNotification(fileIds, folderId) {
  return request('/notifications/batch-upload', {
    method: 'POST',
    body: JSON.stringify({ fileIds, folderId }),
  });
}
export async function updateFileText(id, extractedText, pageCount) {
  return request(`/files/${id}/text`, {
    method: 'PUT',
    body: JSON.stringify({ extractedText, pageCount }),
  });
}
export async function extractFileText(id) {
  return request(`/files/${id}/extract`, {
    method: 'POST',
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
export async function getFilePreviewUrlByFileId(fileId) {
  const data = await request(`/files/${fileId}/preview-url`);
  return data.url;
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
export async function deleteUser(id) {
  return request(`/users/${id}`, { method: 'DELETE' });
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

// ── Settings / Logos ─────────────────────────────────────
export async function getLogos() {
  return request('/settings/logos');
}
export async function uploadLogo(type, file) {
  const formData = new FormData();
  formData.append('logo', file);
  return request(`/settings/logo/${type}`, {
    method: 'POST',
    body: formData,
  });
}

// ── SSL Certificates ──────────────────────────────────────
export async function getSslCertificates() {
  return request('/settings/ssl');
}
export async function uploadSslCertificate(name, certFile, keyFile, passphrase) {
  const formData = new FormData();
  formData.append('name', name);
  formData.append('certificate', certFile);
  if (keyFile) {
    formData.append('privateKey', keyFile);
  }
  if (passphrase) {
    formData.append('passphrase', passphrase);
  }
  return request('/settings/ssl/upload', {
    method: 'POST',
    body: formData,
  });
}
export async function deleteSslCertificate(id) {
  return request(`/settings/ssl/${id}`, { method: 'DELETE' });
}
export async function activateSslCertificate(id) {
  return request(`/settings/ssl/${id}/activate`, { method: 'POST' });
}
export async function deactivateSslCertificates() {
  return request('/settings/ssl/deactivate', { method: 'POST' });
}

// ── SMTP Settings ────────────────────────────────────────
export async function getSmtpSettings() {
  return request('/smtp/settings');
}
export async function saveSmtpSettings(settings) {
  return request('/smtp/settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  });
}
export async function testSmtpEmail(to_email) {
  return request('/smtp/test', {
    method: 'POST',
    body: JSON.stringify({ to_email }),
  });
}

// ── SAML/SSO Settings ─────────────────────────────────────
export async function getSamlSettings() {
  return request('/saml/settings');
}
export async function saveSamlSettings(settings) {
  return request('/saml/settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  });
}
export async function getSamlStatus() {
  return request('/saml/status');
}
export function getSamlLoginUrl() {
  return `${API_BASE}/saml/login`;
}
export function getSamlMetadataUrl() {
  return `${API_BASE}/saml/metadata`;
}

export async function getSupportEmail() {
  return request('/help-ticket/support-email');
}
export async function setSupportEmail(email) {
  return request('/help-ticket/support-email', { method: 'POST', body: JSON.stringify({ email }) });
}
export async function getEmailSettings() {
  return request('/help-ticket/email-settings');
}
export async function setEmailSettings(signature, brandColor, subjectPrefix) {
  return request('/help-ticket/email-settings', { method: 'POST', body: JSON.stringify({ signature, brandColor, subjectPrefix }) });
}
export async function submitHelpTicket(subject, message, attachments) {
  const formData = new FormData();
  formData.append('subject', subject);
  formData.append('message', message);
  if (attachments && attachments.length > 0) {
    attachments.forEach((file) => {
      formData.append('attachments', file);
    });
  }
  return request('/help-ticket/submit', { method: 'POST', body: formData });
}

export async function getCustomApps() {
  return request('/custom-apps');
}
export async function createCustomApp(name, abbreviation, link) {
  return request('/custom-apps', { method: 'POST', body: JSON.stringify({ name, abbreviation, link }) });
}
export async function updateCustomApp(id, name, abbreviation, link) {
  return request(`/custom-apps/${id}`, { method: 'PUT', body: JSON.stringify({ name, abbreviation, link }) });
}
export async function deleteCustomApp(id) {
  return request(`/custom-apps/${id}`, { method: 'DELETE' });
}
export async function getCustomAppPermissions() {
  return request('/custom-apps/permissions');
}
export async function setCustomAppPermission(appId, groupId, canView) {
  return request(`/custom-apps/permissions/${appId}/${groupId}`, { method: 'PUT', body: JSON.stringify({ canView }) });
}

// DMS Connection Settings (Microsoft SQL Server)
export async function getDmsSettings() {
  return request('/dms-settings');
}
export async function saveDmsSettings(settings) {
  return request('/dms-settings', { method: 'POST', body: JSON.stringify(settings) });
}
export async function testDmsConnection(settings) {
  return request('/dms-settings/test', { method: 'POST', body: JSON.stringify(settings) });
}

// DMS Schedules
export async function getDmsSchedules() {
  return request('/dms-settings/schedules');
}
export async function updateDmsSchedule(id, data) {
  return request(`/dms-settings/schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}
export async function runDmsSchedule(id) {
  return request(`/dms-settings/schedules/${id}/run`, { method: 'POST' });
}

// ── Azure Storage Settings ──────────────────────────────────
export async function getAzureSettings() {
  return request('/azure/settings');
}
export async function saveAzureSettings(settings) {
  return request('/azure/settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  });
}
export async function testAzureConnection(settings) {
  return request('/azure/test', {
    method: 'POST',
    body: JSON.stringify(settings),
  });
}

export async function getSecuritySettings() {
  return request('/settings/security');
}

export async function saveSecuritySettings(settings) {
  return request('/settings/security', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

export async function getCreditHoldInquiries() {
  return request('/cht/inquiries');
}

export async function createCreditHoldInquiry(invoiceNumber, notes) {
  return request('/cht/inquiries', {
    method: 'POST',
    body: JSON.stringify({ invoiceNumber, notes }),
  });
}

export async function acceptCreditHoldInquiry(inquiryId) {
  return request(`/cht/inquiries/${inquiryId}/accept`, { method: 'POST' });
}

export async function getCreditHoldStatuses() {
  return request('/cht/statuses');
}

export async function createCreditHoldStatus(name, color, sortOrder) {
  return request('/cht/statuses', {
    method: 'POST',
    body: JSON.stringify({ name, color, sortOrder }),
  });
}

export async function updateCreditHoldStatus(id, name, color, sortOrder, isDefault) {
  return request(`/cht/statuses/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name, color, sortOrder, isDefault }),
  });
}

export async function deleteCreditHoldStatus(id) {
  return request(`/cht/statuses/${id}`, { method: 'DELETE' });
}

export async function getCreditHoldInquiryResponses(inquiryId) {
  return request(`/cht/inquiries/${inquiryId}/responses`);
}

export async function respondToCreditHoldInquiry(inquiryId, statusId, response) {
  return request(`/cht/inquiries/${inquiryId}/respond`, {
    method: 'POST',
    body: JSON.stringify({ statusId, response }),
  });
}

export async function toggleCreditHoldInquiryClosed(inquiryId) {
  return request(`/cht/inquiries/${inquiryId}/toggle-closed`, {
    method: 'POST',
  });
}

// ── DCV (Dealer Customer Vision) ──────────────────────────────
export async function searchDcvCustomers(query) {
  return request(`/dcv/search?q=${encodeURIComponent(query)}`);
}

export async function getDcvCustomer(id) {
  return request(`/dcv/${id}`);
}

export async function getDcvCustomerByCusId(cusId) {
  return request(`/dcv/by-cus-id/${encodeURIComponent(cusId)}`);
}

export async function getDcvCustomerTimeline(id, page = 1, pageSize = 20, filterType = null) {
  let url = `/dcv/${id}/timeline?page=${page}&pageSize=${pageSize}`;
  if (filterType) {
    url += `&filterType=${filterType}`;
  }
  return request(url);
}

export async function getDcvRepairOrders(id, page = 1, pageSize = 20, filterType = null, search = null) {
  let url = `/dcv/${id}/repair-orders?page=${page}&pageSize=${pageSize}`;
  if (filterType) {
    url += `&filterType=${filterType}`;
  }
  if (search) {
    url += `&search=${encodeURIComponent(search)}`;
  }
  return request(url);
}

export async function getDcvVinLookup(vin) {
  return request(`/dcv/vin/${vin}`);
}