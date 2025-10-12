import auth from "./auth.route.js";
import uploads from "./uploads.route.js";
import { ROUTES } from "../utils/routes.js";

function router(app) {
  app.use(`/api${ROUTES.AUTH}`, auth);
  app.use(`/api${ROUTES.UPLOADS}`, uploads);
}

export default router;
