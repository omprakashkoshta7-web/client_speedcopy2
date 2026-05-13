/**
 * File Storage Service
 * Handles storage of large files using IndexedDB instead of localStorage
 * to avoid quota exceeded errors
 */

const DB_NAME = 'SpeedCopyFileStorage';
const DB_VERSION = 1;
const STORE_NAME = 'uploadedFiles';

class FileStorageService {
  private db: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          objectStore.createIndex('uploadedAt', 'uploadedAt', { unique: false });
          console.log('✅ Object store created');
        }
      };
    });
  }

  /**
   * Compress image to reduce file size
   */
  async compressImage(dataUrl: string, maxWidth: number = 1200, quality: number = 0.7): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to JPEG with compression
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = dataUrl;
    });
  }

  /**
   * Save file to IndexedDB
   */
  async saveFile(file: any): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      
      const request = objectStore.put(file);

      request.onsuccess = () => {
        console.log('✅ File saved to IndexedDB:', file.id);
        resolve();
      };

      request.onerror = () => {
        console.error('❌ Failed to save file:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all files from IndexedDB
   */
  async getAllFiles(): Promise<any[]> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        console.error('❌ Failed to get files:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete file from IndexedDB
   */
  async deleteFile(fileId: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.delete(fileId);

      request.onsuccess = () => {
        console.log('✅ File deleted from IndexedDB:', fileId);
        resolve();
      };

      request.onerror = () => {
        console.error('❌ Failed to delete file:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Clear all files from IndexedDB
   */
  async clearAllFiles(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.clear();

      request.onsuccess = () => {
        console.log('✅ All files cleared from IndexedDB');
        resolve();
      };

      request.onerror = () => {
        console.error('❌ Failed to clear files:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get storage usage estimate
   */
  async getStorageEstimate(): Promise<{ usage: number; quota: number; percentage: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percentage = quota > 0 ? (usage / quota) * 100 : 0;

      return {
        usage,
        quota,
        percentage
      };
    }

    return { usage: 0, quota: 0, percentage: 0 };
  }

  /**
   * Migrate from localStorage to IndexedDB
   */
  async migrateFromLocalStorage(): Promise<void> {
    try {
      const localStorageData = localStorage.getItem('uploadedFiles');
      if (!localStorageData) return;

      const files = JSON.parse(localStorageData);
      
      if (Array.isArray(files) && files.length > 0) {
        console.log(`🔄 Migrating ${files.length} files from localStorage to IndexedDB...`);
        
        for (const file of files) {
          await this.saveFile(file);
        }

        // Clear localStorage after successful migration
        localStorage.removeItem('uploadedFiles');
        console.log('✅ Migration completed successfully');
      }
    } catch (error) {
      console.error('❌ Migration failed:', error);
    }
  }
}

// Export singleton instance
const fileStorageService = new FileStorageService();
export default fileStorageService;
