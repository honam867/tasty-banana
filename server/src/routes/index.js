import auth from "./auth.route.js";
import uploads from "./uploads.route.js";
import threads from "./threads.route.js";
import jobs from "./jobs.route.js";
import { ROUTES } from "../utils/routes.js";

function router(app) {
  app.use(`/api${ROUTES.AUTH}`, auth);
  app.use(`/api${ROUTES.UPLOADS}`, uploads);
  app.use(`/api${ROUTES.THREADS}`, threads);
  app.use(`/api${ROUTES.JOBS}`, jobs);
}

export default router;
