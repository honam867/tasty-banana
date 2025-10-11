import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import route from '../../src/routes/index.js';

/**
 * Create Express app instance for testing
 * This factory allows us to create a fresh app instance for each test
 * without starting the actual server
 * @returns {Express} Express application instance
 */
export const createApp = () => {
  const app = express();

  // Apply middlewares (same as production)
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Apply routes (same as production)
  route(app);

  return app;
};
