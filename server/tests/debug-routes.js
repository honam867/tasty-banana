import dotenv from 'dotenv';
dotenv.config();

import request from 'supertest';
import { createApp } from './utils/appFactory.js';

const app = createApp();

// Test what routes are available
const testRoutes = async () => {
  console.log('\n🧪 Testing Routes:\n');
  
  const paths = [
    '/api/auth/register',
    '/api//auth/register',
    '/api/auth/login',
  ];
  
  for (const path of paths) {
    const response = await request(app).post(path).send({});
    console.log(`${path}: ${response.status} ${response.statusText || response.text}`);
  }
};

testRoutes();

