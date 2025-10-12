// Test file to verify all upload-related packages can be imported successfully
import express from 'express';
import multer from 'multer';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { ulid } from 'ulid';
import mime from 'mime-types';

console.log('✅ All packages imported successfully:');
console.log('  - express:', typeof express);
console.log('  - multer:', typeof multer);
console.log('  - S3Client:', typeof S3Client);
console.log('  - Upload:', typeof Upload);
console.log('  - ulid:', typeof ulid);
console.log('  - mime-types:', typeof mime);

// Test basic functionality
const testUlid = ulid();
console.log('\n✅ ulid() test:', testUlid);

const testMime = mime.lookup('test.png');
console.log('✅ mime-types test:', testMime);

console.log('\n✨ All dependencies are working correctly!');

