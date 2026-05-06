
// => import 
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { sql } from "./config/db.js"; 
import jwt from 'jsonwebtoken';

import cookieParser from "cookie-parser";

dotenv.config(); // => Load environment variables from .env file

const app = express();
const PORT = process.env.PORT || 5000;

