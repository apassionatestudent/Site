import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import cors from "cors";

import { sql } from "./config/db.js"; 

import cookieParser from "cookie-parser";
import jwt from 'jsonwebtoken';


import locationRoutes, { loadLocationCache } from './routes/location.js';
import referenceRoutes from './routes/reference.js';

import studentAuthRouter from './routes/studentAuth.js';

import path from "path";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const __dirname = path.resolve();


// => Middleware
app.use(cors({
  	origin: "http://localhost:5173", // the frontend URL, will be changed into 3A.com [example] when deployed
  	credentials: true
}));

app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

// => Routes
app.use('/api/location', locationRoutes);
app.use('/api/reference', referenceRoutes);
app.use('/api/student-auth', studentAuthRouter);


async function initDB () {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS students (
        -- => Internal DB key: auto-increments (1, 2, 3...), never exposed outside the server
        student_id          BIGSERIAL PRIMARY KEY,

        -- => Public-facing ID: used in URLs and API responses instead of student_id
        public_id           UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,

        -- => Username is the student's email address; must be unique across all accounts
        username            VARCHAR(255) NOT NULL UNIQUE,

        -- => NULL by default: only gets filled once the student sets a password after confirming email
        password_hash       TEXT NULL,

        -- => Tracks whether the student clicked the confirmation link sent to their email
        -- => Defaults to FALSE; unconfirmed accounts should not be allowed to log in
        is_email_confirmed  BOOLEAN NOT NULL DEFAULT FALSE,

        -- => Admins can flip this to FALSE to suspend a suspicious or policy-violating account
        -- => Defaults to TRUE on creation
        is_active           BOOLEAN NOT NULL DEFAULT TRUE,

        -- => Auto-set on row creation; never manually updated
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        -- => Updated via trigger whenever the student changes their email or password
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        -- => Nullable: stays NULL until the student logs in for the first time
        last_login_at       TIMESTAMPTZ NULL
      )
      `;

    await sql`
      -- => Reusable trigger function: sets updated_at to NOW() on any row update
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;

    await sql`
      -- => Attach the trigger to the students table only if it doesn't already exist
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'students_set_updated_at'
        ) THEN
          CREATE TRIGGER students_set_updated_at
          BEFORE UPDATE ON students
          FOR EACH ROW
          EXECUTE FUNCTION set_updated_at();
        END IF;
      END $$
    `;

    await sql`
      -- => Optional constraint: prevents a password from being saved on an unconfirmed account
      -- => Checks pg_constraint first since ADD CONSTRAINT IF NOT EXISTS is not supported in PostgreSQL
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'chk_password_requires_confirmed_email'
        ) THEN
          ALTER TABLE students
          ADD CONSTRAINT chk_password_requires_confirmed_email
          CHECK (
            password_hash IS NULL OR is_email_confirmed = TRUE
          );
        END IF;
      END $$
    `;

    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
    process.exit(1); // => Stop the server if DB init fails; no point running without a DB
  }
}

// => Wrap in async IIFE so loadLocationCache fully completes before server starts
(async () => {
  // => Pre-load location data from psgc.cloud into memory before accepting requests
  await loadLocationCache();

  // => Initialize database tables before accepting requests
  await initDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})();