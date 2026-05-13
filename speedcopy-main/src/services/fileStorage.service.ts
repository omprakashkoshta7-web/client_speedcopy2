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

  private async runStoreRequest<T>(
    mode: IDBTransactionMode,
    createRequest: (objectStore: IDBObjectStore) => IDBRequest,
    getResult: (request: IDBRequest) => T,
    errorMessage: string,
    successMessage?: string
  ): Promise<T> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], mode);
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = createRequest(objectStore);

      request.onsuccess = () => {
        if (successMessage) {
          console.log(successMessage);
        }
        resolve(getResult(request));
      };

      request.onerror = () => {
        console.error(errorMessage, request.error);
        reject(request.error);
      };
    });
  }

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
    return this.runStoreRequest(
      'readwrite',
      objectStore => objectStore.put(file),
      () => undefined,
      'Failed to save file:',
      `File saved to IndexedDB: ${file.id}`
    );
  }

  /**
   * Get all files from IndexedDB
   */
  async getAllFiles(): Promise<any[]> {
    return this.runStoreRequest(
      'readonly',
      objectStore => objectStore.getAll(),
      request => request.result || [],
      'Failed to get files:'
    );
  }

  /**
   * Get a single file from IndexedDB by ID
   */
  async getFile(fileId: string): Promise<any | null> {
    return this.runStoreRequest(
      'readonly',
      objectStore => objectStore.get(fileId),
      request => request.result || null,
      'Failed to get file:'
    );
  }

  /**
   * Delete file from IndexedDB
   */
  async deleteFile(fileId: string): Promise<void> {
    return this.runStoreRequest(
      'readwrite',
      objectStore => objectStore.delete(fileId),
      () => undefined,
      'Failed to delete file:',
      `File deleted from IndexedDB: ${fileId}`
    );
  }

  /**
   * Clear all files from IndexedDB
   */
  async clearAllFiles(): Promise<void> {
    return this.runStoreRequest(
      'readwrite',
      objectStore => objectStore.clear(),
      () => undefined,
      'Failed to clear files:',
      'All files cleared from IndexedDB'
    );
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
