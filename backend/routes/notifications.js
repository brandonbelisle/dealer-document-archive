// routes/notifications.js
// Notifications for subscribed users when files are uploaded
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const socket = require('../socket');

const router = express.Router();

// ── GET /api/notifications ─────────────────────────────────
// Get all unread (or all) notifications for the current user
router.get('/', requireAuth, async (req, res) => {
  try {
    const unreadOnly = req.query.unreadOnly === 'true';
    
    let sql = `SELECT id, notification_type, item_type, item_id, item_name, 
                      location_name, department_name, file_name, file_id,
                      created_by_name, created_at, read_at
               FROM notifications 
               WHERE user_id = ?`;
    if (unreadOnly) sql += ' AND read_at IS NULL';
    sql += ' ORDER BY created_at DESC LIMIT 100';
    
    const [rows] = await db.execute(sql, [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/notifications/:id/read ───────────────────────
// Mark a single notification as read
router.put('/:id/read', requireAuth, async (req, res) => {
  try {
    const [existing] = await db.execute(
      'SELECT id FROM notifications WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await db.execute(
      'UPDATE notifications SET read_at = NOW() WHERE id = ?',
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/notifications/mark-all-read ──────────────────
// Mark all notifications as read for the current user
router.put('/mark-all-read', requireAuth, async (req, res) => {
  try {
    await db.execute(
      'UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL',
      [req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/notifications/unread-count ──────────────────
// Get count of unread notifications
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND read_at IS NULL',
      [req.user.id]
    );
    res.json({ count: rows[0].count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/notifications ─────────────────────────────
// Delete all read notifications older than a certain time
router.delete('/', requireAuth, async (req, res) => {
  try {
    await db.execute(
      'DELETE FROM notifications WHERE user_id = ? AND read_at IS NOT NULL',
      [req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/notifications/batch-upload ──────────────────
// Create a summary notification for multiple uploaded files
router.post('/batch-upload', requireAuth, async (req, res) => {
  try {
    const { fileIds, folderId } = req.body;
    
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ error: 'No file IDs provided' });
    }
    
    // If only one file, use the regular notification
    if (fileIds.length === 1) {
      return createNotificationsForUpload({
        fileId: fileIds[0],
        fileName: null, // Will be fetched
        folderId,
        uploadedBy: req.user.id,
        uploadedByName: req.user.displayName || req.user.username || 'Unknown',
      }).then(() => res.json({ success: true }));
    }
    
    // Get file details
    const [files] = await db.execute(
      `SELECT id, name FROM files WHERE id IN (${fileIds.map(() => '?').join(',')})`,
      fileIds
    );
    
    if (files.length === 0) {
      return res.status(404).json({ error: 'Files not found' });
    }
    
    // Create batch notification
    await createBatchNotifications({
      files,
      folderId,
      uploadedBy: req.user.id,
      uploadedByName: req.user.displayName || req.user.username || 'Unknown',
    });
    
    res.json({ success: true, notified: files.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Helper: Create notifications for subscribers ───────────
// Called when a file is uploaded
async function createNotificationsForUpload(uploadInfo) {
  const { fileId, fileName, folderId, uploadedBy, uploadedByName } = uploadInfo;
  
  try {
    // Get folder details if file is in a folder
    let locationId = null;
    let locationName = null;
    let departmentId = null;
    let departmentName = null;
    
    if (folderId) {
      const [folders] = await db.execute(
        `SELECT f.id, f.name, f.location_id, f.department_id, 
                l.name AS location_name, d.name AS department_name
         FROM folders f
         LEFT JOIN locations l ON f.location_id = l.id
         LEFT JOIN departments d ON f.department_id = d.id
         WHERE f.id = ?`,
        [folderId]
      );
      if (folders.length > 0) {
        locationId = folders[0].location_id;
        locationName = folders[0].location_name;
        departmentId = folders[0].department_id;
        departmentName = folders[0].department_name;
      }
    }

    // Find all users subscribed to: this specific folder, its department, or its location
    // They should NOT receive notification if they uploaded the file themselves
    let subscriberQuery = `
      SELECT DISTINCT s.user_id
      FROM subscriptions s
      WHERE (s.subscription_type = 'folder' COLLATE utf8mb4_unicode_ci AND s.subscription_id = ?)
    `;
    const params = [folderId];
    
    if (departmentId) {
      subscriberQuery += ` OR (s.subscription_type = 'department' COLLATE utf8mb4_unicode_ci AND s.subscription_id = ?)`;
      params.push(departmentId);
    }
    if (locationId) {
      subscriberQuery += ` OR (s.subscription_type = 'location' COLLATE utf8mb4_unicode_ci AND s.subscription_id = ?)`;
      params.push(locationId);
    }
    
    const [subscribers] = await db.execute(subscriberQuery, params);
    
    // Create notification for each subscriber (except the uploader)
    for (const sub of subscribers) {
      if (sub.user_id === uploadedBy) continue; // Don't notify the uploader
      
      const notificationId = uuidv4();
      
      // Determine notification_type and item_type based on match
      let notificationType = 'folder_upload';
      let itemType = 'folder';
      let itemName = null;
      
      // Get the subscribed item name
      const [subDetails] = await db.execute(
        `SELECT s.subscription_type, s.subscription_id,
                CASE 
                  WHEN s.subscription_type = 'location' COLLATE utf8mb4_unicode_ci THEN l.name
                  WHEN s.subscription_type = 'department' COLLATE utf8mb4_unicode_ci THEN d.name
                  WHEN s.subscription_type = 'folder' COLLATE utf8mb4_unicode_ci THEN f.name
                END AS item_name_val
         FROM subscriptions s
         LEFT JOIN locations l ON s.subscription_type = 'location' COLLATE utf8mb4_unicode_ci AND s.subscription_id = l.id
         LEFT JOIN departments d ON s.subscription_type = 'department' COLLATE utf8mb4_unicode_ci AND s.subscription_id = d.id
         LEFT JOIN folders f ON s.subscription_type = 'folder' COLLATE utf8mb4_unicode_ci AND s.subscription_id = f.id
         WHERE s.user_id = ? AND (
           (s.subscription_type = 'folder' COLLATE utf8mb4_unicode_ci AND s.subscription_id = ?)
           ${departmentId ? 'OR (s.subscription_type = \'department\' COLLATE utf8mb4_unicode_ci AND s.subscription_id = ?)' : ''}
           ${locationId ? 'OR (s.subscription_type = \'location\' COLLATE utf8mb4_unicode_ci AND s.subscription_id = ?)' : ''}
         )
         LIMIT 1`,
        params.length === 1 ? [sub.user_id, folderId] : 
          departmentId && locationId ? [sub.user_id, folderId, departmentId, locationId] :
          departmentId ? [sub.user_id, folderId, departmentId] : [sub.user_id, folderId, locationId]
      );
      
      if (subDetails.length > 0) {
        itemType = subDetails[0].subscription_type;
        itemName = subDetails[0].item_name_val;
      }
      
      await db.execute(
        `INSERT INTO notifications 
         (id, user_id, notification_type, item_type, item_id, item_name, 
          location_name, department_name, file_name, file_id, created_by_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          notificationId,
          sub.user_id,
          notificationType,
          itemType,
          sub.subscription_id || folderId,
          itemName,
          locationName,
          departmentName,
          fileName,
          fileId,
          uploadedByName
        ]
      );
      
      // Emit socket event for real-time notification
      socket.notificationCreated(sub.user_id, {
        id: notificationId,
        notification_type: notificationType,
        item_type: itemType,
        item_id: sub.subscription_id || folderId,
        item_name: itemName,
        location_name: locationName,
        department_name: departmentName,
        file_name: fileName,
        file_id: fileId,
        created_by_name: uploadedByName,
        created_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('Error creating notifications:', err);
    // Don't throw - notifications are not critical to the upload process
  }
}

// ── Helper: Create notifications for unsorted uploads ──────
async function createNotificationsForUnsortedUpload(uploadInfo) {
  const { fileId, fileName, uploadedBy, uploadedByName } = uploadInfo;
  
  try {
    // For unsorted files, we could notify admins or users with certain permissions
    // For now, we'll skip unsorted uploads
  } catch (err) {
    console.error('Error creating unsorted notifications:', err);
  }
}

// ── Helper: Create batch notification for multiple uploads ─
// Creates a single summary notification for multiple file uploads
async function createBatchNotifications(uploadInfo) {
  const { files, folderId, uploadedBy, uploadedByName } = uploadInfo;
  
  if (!files || files.length === 0) return;
  
  try {
    // If only one file, use the regular notification
    if (files.length === 1) {
      return createNotificationsForUpload({
        fileId: files[0].id,
        fileName: files[0].name,
        folderId,
        uploadedBy,
        uploadedByName,
      });
    }
    
    // Get folder details if files are in a folder
    let locationId = null;
    let locationName = null;
    let departmentId = null;
    let departmentName = null;
    let itemType = 'folder';
    let itemName = null;
    
    if (folderId) {
      const [folders] = await db.execute(
        `SELECT f.id, f.name, f.location_id, f.department_id, 
                l.name AS location_name, d.name AS department_name
         FROM folders f
         LEFT JOIN locations l ON f.location_id = l.id
         LEFT JOIN departments d ON f.department_id = d.id
         WHERE f.id = ?`,
        [folderId]
      );
      if (folders.length > 0) {
        locationId = folders[0].location_id;
        locationName = folders[0].location_name;
        departmentId = folders[0].department_id;
        departmentName = folders[0].department_name;
        itemType = 'folder';
        itemName = folders[0].name;
      }
    }
    
    // Find all users subscribed to: this specific folder, its department, or its location
    let subscriberQuery = `
      SELECT DISTINCT s.user_id
      FROM subscriptions s
      WHERE (s.subscription_type = 'folder' COLLATE utf8mb4_unicode_ci AND s.subscription_id = ?)
    `;
    const params = [folderId];
    
    if (departmentId) {
      subscriberQuery += ` OR (s.subscription_type = 'department' COLLATE utf8mb4_unicode_ci AND s.subscription_id = ?)`;
      params.push(departmentId);
    }
    if (locationId) {
      subscriberQuery += ` OR (s.subscription_type = 'location' COLLATE utf8mb4_unicode_ci AND s.subscription_id = ?)`;
      params.push(locationId);
    }
    
    const [subscribers] = await db.execute(subscriberQuery, params);
    
    // Create ONE summary notification for each subscriber (except the uploader)
    const fileNames = files.length <= 5 
      ? files.map(f => f.name).join(', ')
      : `${files.slice(0, 5).map(f => f.name).join(', ')} and ${files.length - 5} more`;
    
    for (const sub of subscribers) {
      if (sub.user_id === uploadedBy) continue;
      
      const notificationId = uuidv4();
      
      await db.execute(
        `INSERT INTO notifications 
         (id, user_id, notification_type, item_type, item_id, item_name, 
          location_name, department_name, file_name, file_id, created_by_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          notificationId,
          sub.user_id,
          'batch_upload',
          itemType,
          folderId,
          itemName,
          locationName,
          departmentName,
          fileNames,
          files.length > 1 ? files.map(f => f.id).join(',') : files[0].id,
          uploadedByName
        ]
      );
      
      // Emit socket event for real-time notification
      socket.notificationCreated(sub.user_id, {
        id: notificationId,
        notification_type: 'batch_upload',
        item_type: itemType,
        item_id: folderId,
        item_name: itemName,
        location_name: locationName,
        department_name: departmentName,
        file_name: fileNames,
        file_id: files.map(f => f.id).join(','),
        created_by_name: uploadedByName,
        created_at: new Date().toISOString(),
        batch_count: files.length,
      });
    }
  } catch (err) {
    console.error('Error creating batch notifications:', err);
  }
}

module.exports = {
  router,
  createNotificationsForUpload,
  createNotificationsForUnsortedUpload,
  createBatchNotifications
};