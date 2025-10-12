import { generateStorageKey, extractSlugFromKey, slugifyFilename } from '../../src/utils/storageKey.js';

describe('Storage Key Utility', () => {
  const testUserId = '123e4567-e89b-12d3-a456-426614174000';
  const testDate = new Date('2025-10-12T10:30:00.000Z');

  describe('slugifyFilename', () => {
    it('should convert filename to lowercase and replace spaces with dashes', () => {
      const result = slugifyFilename('My Test File.jpg');
      expect(result).toBe('my-test-file');
    });

    it('should remove file extensions', () => {
      const result = slugifyFilename('document.pdf');
      expect(result).toBe('document');
    });

    it('should handle multiple extensions', () => {
      const result = slugifyFilename('archive.tar.gz');
      expect(result).toBe('archive-tar');
    });

    it('should replace special characters with dashes', () => {
      const result = slugifyFilename('file@#$%name!.png');
      expect(result).toBe('file-name');
    });

    it('should handle Vietnamese characters', () => {
      const result = slugifyFilename('Ảnh Đẹp Việt Nam.jpg');
      expect(result).toBe('nh-p-vi-t-nam');
    });

    it('should truncate long filenames to max length', () => {
      const longName = 'a'.repeat(100) + '.jpg';
      const result = slugifyFilename(longName, 60);
      expect(result.length).toBeLessThanOrEqual(60);
    });

    it('should remove leading and trailing dashes', () => {
      const result = slugifyFilename('---test-file---.png');
      expect(result).toBe('test-file');
    });

    it('should handle filenames with only special characters', () => {
      const result = slugifyFilename('@#$%^&*.jpg');
      expect(result).toBe('unnamed');
    });

    it('should handle empty filenames', () => {
      const result = slugifyFilename('');
      expect(result).toBe('unnamed');
    });

    it('should handle filenames with numbers', () => {
      const result = slugifyFilename('image-123-456.png');
      expect(result).toBe('image-123-456');
    });

    it('should collapse multiple dashes into single dashes', () => {
      const result = slugifyFilename('test---multiple---dashes.jpg');
      expect(result).toBe('test-multiple-dashes');
    });
  });

  describe('generateStorageKey', () => {
    it('should generate key with correct format', () => {
      const key = generateStorageKey(testUserId, 'test-file.jpg', testDate);
      
      // Check pattern: u/{user_id}/{yyyy}/{mm}/{dd}/{ulid}_{slug}
      expect(key).toMatch(/^u\/[0-9a-f-]+\/\d{4}\/\d{2}\/\d{2}\/[0-9A-Z]+_[a-z0-9-]+$/);
    });

    it('should include correct user ID in path', () => {
      const key = generateStorageKey(testUserId, 'test.jpg', testDate);
      expect(key).toContain(`u/${testUserId}/`);
    });

    it('should use UTC date components correctly', () => {
      const key = generateStorageKey(testUserId, 'test.jpg', testDate);
      expect(key).toContain('/2025/10/12/');
    });

    it('should include slugified filename', () => {
      const key = generateStorageKey(testUserId, 'My Test File.jpg', testDate);
      expect(key).toContain('_my-test-file');
    });

    it('should generate unique keys for same filename', () => {
      const key1 = generateStorageKey(testUserId, 'same.jpg', testDate);
      const key2 = generateStorageKey(testUserId, 'same.jpg', testDate);
      
      // Keys should be different due to ULID uniqueness
      expect(key1).not.toBe(key2);
      
      // But should have same base structure
      const key1Parts = key1.split('/');
      const key2Parts = key2.split('/');
      expect(key1Parts[0]).toBe(key2Parts[0]); // u
      expect(key1Parts[1]).toBe(key2Parts[1]); // user_id
      expect(key1Parts[2]).toBe(key2Parts[2]); // year
      expect(key1Parts[3]).toBe(key2Parts[3]); // month
      expect(key1Parts[4]).toBe(key2Parts[4]); // day
    });

    it('should handle different user IDs', () => {
      const userId1 = '111e4567-e89b-12d3-a456-426614174000';
      const userId2 = '222e4567-e89b-12d3-a456-426614174000';
      
      const key1 = generateStorageKey(userId1, 'test.jpg', testDate);
      const key2 = generateStorageKey(userId2, 'test.jpg', testDate);
      
      expect(key1).toContain(userId1);
      expect(key2).toContain(userId2);
      expect(key1).not.toBe(key2);
    });

    it('should handle filenames with special characters', () => {
      const key = generateStorageKey(testUserId, 'Special @#$ File!.jpg', testDate);
      expect(key).toMatch(/_special-file$/);
    });

    it('should handle very long filenames', () => {
      const longName = 'a'.repeat(100) + '.jpg';
      const key = generateStorageKey(testUserId, longName, testDate);
      
      // Extract the slug part (after last ULID_)
      const parts = key.split('_');
      const slug = parts[parts.length - 1];
      
      expect(slug.length).toBeLessThanOrEqual(60);
    });

    it('should use current date when no date provided', () => {
      const now = new Date();
      const key = generateStorageKey(testUserId, 'test.jpg');
      
      const year = now.getUTCFullYear();
      const month = String(now.getUTCMonth() + 1).padStart(2, '0');
      
      expect(key).toContain(`/${year}/${month}/`);
    });

    it('should throw error when userId is missing', () => {
      expect(() => {
        generateStorageKey(null, 'test.jpg');
      }).toThrow('userId is required');
    });

    it('should throw error when originalFilename is missing', () => {
      expect(() => {
        generateStorageKey(testUserId, null);
      }).toThrow('originalFilename is required');
    });

    it('should handle edge case: filename is only extension', () => {
      const key = generateStorageKey(testUserId, '.jpg', testDate);
      expect(key).toContain('_unnamed');
    });

    it('should handle different date values correctly', () => {
      const date1 = new Date('2024-01-01T00:00:00.000Z');
      const date2 = new Date('2024-12-31T23:59:59.999Z');
      
      const key1 = generateStorageKey(testUserId, 'test.jpg', date1);
      const key2 = generateStorageKey(testUserId, 'test.jpg', date2);
      
      expect(key1).toContain('/2024/01/01/');
      expect(key2).toContain('/2024/12/31/');
    });

    it('should pad single-digit months and days with zeros', () => {
      const date = new Date('2024-03-05T10:00:00.000Z');
      const key = generateStorageKey(testUserId, 'test.jpg', date);
      
      expect(key).toContain('/2024/03/05/');
    });
  });

  describe('extractSlugFromKey', () => {
    it('should extract slug from valid storage key', () => {
      const key = 'u/123/2025/10/12/01HF5G3P7XYZ123_my-test-file';
      const slug = extractSlugFromKey(key);
      expect(slug).toBe('my-test-file');
    });

    it('should return null for invalid storage key', () => {
      const slug = extractSlugFromKey('invalid-key');
      expect(slug).toBeNull();
    });

    it('should handle keys without underscores', () => {
      const slug = extractSlugFromKey('u/123/2025/10/12/test');
      expect(slug).toBeNull();
    });
  });

  describe('Collision resistance', () => {
    it('should generate 100 unique keys for same inputs', () => {
      const keys = new Set();
      
      for (let i = 0; i < 100; i++) {
        const key = generateStorageKey(testUserId, 'same-file.jpg', testDate);
        keys.add(key);
      }
      
      // All keys should be unique due to ULID
      expect(keys.size).toBe(100);
    });

    it('should have consistent key structure across generations', () => {
      const key1 = generateStorageKey(testUserId, 'test.jpg', testDate);
      const key2 = generateStorageKey(testUserId, 'other.jpg', testDate);
      
      // Both should start with same base path
      const basePath = `u/${testUserId}/2025/10/12/`;
      expect(key1).toContain(basePath);
      expect(key2).toContain(basePath);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle real-world filenames', () => {
      const filenames = [
        'Screenshot 2024-10-12 at 3.45.23 PM.png',
        'IMG_1234.HEIC',
        'document (final) [v2].pdf',
        'image@2x.png',
        'файл.jpg',
        '文件.png',
        'my_file_name.jpeg'
      ];
      
      filenames.forEach(filename => {
        const key = generateStorageKey(testUserId, filename, testDate);
        
        // Each key should be valid
        expect(key).toMatch(/^u\/[0-9a-f-]+\/\d{4}\/\d{2}\/\d{2}\/[0-9A-Z]+_[a-z0-9-]+$/);
        expect(key.length).toBeGreaterThan(0);
      });
    });

    it('should maintain consistency for same inputs within same millisecond', () => {
      const fixedDate = new Date('2025-10-12T10:30:00.000Z');
      const key1 = generateStorageKey(testUserId, 'test.jpg', fixedDate);
      const key2 = generateStorageKey(testUserId, 'test.jpg', fixedDate);
      
      // Should be different due to ULID uniqueness
      expect(key1).not.toBe(key2);
      
      // But should share the same date path structure
      const path1 = key1.split('/').slice(0, 5).join('/');
      const path2 = key2.split('/').slice(0, 5).join('/');
      expect(path1).toBe(path2);
    });
  });
});

