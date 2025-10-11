import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";

import db from "./config/db/index.js";
import route from "./routes/index.js";

import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PORT = process.env.PORT
const BASE_URL = process.env.BASE_URL

const app = express()

db.connect();
app.use(express.static(path.join(__dirname, "public")));
app.use(cors());
app.use(express.json());
app.use(
    express.urlencoded({
        extended: false,
    })
);

route(app);

app.listen(PORT, () => console.log(`Server listening at ${BASE_URL}:${PORT}`));