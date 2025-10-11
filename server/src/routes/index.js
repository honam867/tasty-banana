import express from "express";

import auth from "./auth.route.js";
import { ROUTES } from "../utils/routes.js";

function router(app) {
  app.use(`/api${ROUTES.AUTH}`, auth);
}

export default router;
