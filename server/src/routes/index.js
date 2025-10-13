import auth from "./auth.route.js";
import uploads from "./uploads.route.js";
import threads from "./threads.route.js";
import { ROUTES } from "../utils/routes.js";

function router(app) {
  app.use(`/api${ROUTES.AUTH}`, auth);
  app.use(`/api${ROUTES.UPLOADS}`, uploads);
  app.use(`/api${ROUTES.THREADS}`, threads);
}

export default router;
