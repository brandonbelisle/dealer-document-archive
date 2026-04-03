const DB_NAME = 'dda-file-handles';
const STORE_NAME = 'handles';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

export async function saveHandle(key, handle) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(handle, key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
      
      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('Failed to save handle:', error);
  }
}

export async function getHandle(key) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('Failed to get handle:', error);
    return null;
  }
}

export async function removeHandle(key) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
      
      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('Failed to remove handle:', error);
  }
}

export async function requestPermission(handle) {
  try {
    const permission = await handle.queryPermission({ mode: 'readwrite' });
    if (permission === 'granted') {
      return true;
    }
    
    const request = await handle.requestPermission({ mode: 'readwrite' });
    return request === 'granted';
  } catch (error) {
    console.error('Failed to request permission:', error);
    return false;
  }
}