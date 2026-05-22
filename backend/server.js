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

import branchesRouter from "./routes/branches.js"; 
import coursesRouter from "./routes/courses.js";
import classRouter from "./routes/classes.js";

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

// => Register branches route
app.use("/api/branches", branchesRouter);
// => Register courses route
app.use("/api/courses", coursesRouter);
// => Register classes route
app.use("/api/classes", classRouter);



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

    // branches 
    await sql `
      -- => branch_id: auto-incrementing primary key
      -- => branch_name: display name of the branch
      -- => address: full address string
      -- => office_hours: JSONB so you can store structured per-day schedules
      -- => is_active: soft toggle to hide/show branches without deleting
      -- => created_at: audit timestamp

      CREATE TABLE IF NOT EXISTS branches (
        branch_id   SERIAL PRIMARY KEY,
        branch_name VARCHAR(150)  NOT NULL,
        address     TEXT          NOT NULL,
        office_hours JSONB        NOT NULL DEFAULT '{}',
        is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
        created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    );
    `
    // courses parts 
    await sql `
    -- => sectors: TESDA industry sectors (e.g. ICT, Agriculture, Construction)
    CREATE TABLE IF NOT EXISTS sectors (
      sector_id  SERIAL PRIMARY KEY,
      sector     VARCHAR(150) NOT NULL
    );`

    await sql `
    
    CREATE TABLE IF NOT EXISTS courses (
    course_id        SERIAL PRIMARY KEY,
    title            VARCHAR(255)   NOT NULL,
    description      TEXT,

    -- => TESDA accreditation details per course
    accreditation_no VARCHAR(100)   NOT NULL,
    date_accredited  DATE           NOT NULL,
    expiration_date  DATE           NOT NULL,

    sector_id        INT            REFERENCES sectors(sector_id) ON DELETE SET NULL,

    -- => Default fee => copied to fee_at_enrollment during enrollment, not used for live balance
    amount           NUMERIC(10, 2) NOT NULL DEFAULT 0.00,

    -- => Required training hours set by TESDA
    hours            INT            NOT NULL,

    -- => Reserved for future use
    cover_image_url  TEXT,

    -- => Controls public visibility and enrollment availability
    status           VARCHAR(10)    NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),

    -- => Admin audit trail
    created_by       INT            REFERENCES admins(admin_id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    -- => Soft delete only => never hard delete a course
    deleted_at       TIMESTAMPTZ    DEFAULT NULL
  );`

  await sql `
  -- => Basic competencies are common across all TESDA qualifications
  CREATE TABLE IF NOT EXISTS basic_competency (
    basic_id  SERIAL PRIMARY KEY,
    course_id INT          NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    code      VARCHAR(50)  NOT NULL,
    competency TEXT        NOT NULL
  );`

  await sql `
  -- => Common competencies are sector-specific, shared across courses in the same sector
  CREATE TABLE IF NOT EXISTS common_competency (
    common_id  SERIAL PRIMARY KEY,
    course_id  INT          NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    code       VARCHAR(50)  NOT NULL,
    competency TEXT         NOT NULL
  );`

  await sql `
  -- => Core competencies are unique to each specific qualification
  CREATE TABLE IF NOT EXISTS core_competency (
    core_id    SERIAL PRIMARY KEY,
    course_id  INT          NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    code       VARCHAR(50)  NOT NULL,
    competency TEXT         NOT NULL
  );`

  await sql `
  -- => Junction table => one row per branch that offers a course
  -- => UNIQUE constraint prevents the same course being added to the same branch twice
  CREATE TABLE IF NOT EXISTS course_branch (
    course_branch_id SERIAL PRIMARY KEY,
    course_id        INT NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    branch_id        INT NOT NULL REFERENCES branches(branch_id) ON DELETE CASCADE,
    UNIQUE (course_id, branch_id)
  );`

  await sql `
    CREATE TABLE IF NOT EXISTS national_certification_types (
    certification_id   SERIAL PRIMARY KEY,
    certification_type VARCHAR(100) NOT NULL
  );`

  await sql `
    CREATE TABLE IF NOT EXISTS instructors (
    instructor_id        SERIAL PRIMARY KEY,
    instructor_full_name VARCHAR(150)  NOT NULL,
    contact_number       VARCHAR(20)   NOT NULL,

    -- => Nullable: not required now but reserved for future use
    email                VARCHAR(255)  NULL,

    -- => Audit trail
    created_by           INT           REFERENCES admins(admin_id) ON DELETE SET NULL,
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
  );`

  await sql `
    CREATE TABLE IF NOT EXISTS classes (
    class_id                  SERIAL PRIMARY KEY,

    instructor_id             INT           REFERENCES instructors(instructor_id) ON DELETE SET NULL,
    course_id                 INT           NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    branch_id                 INT           NOT NULL REFERENCES branches(branch_id) ON DELETE CASCADE,

    -- => Date only, no time component needed
    start_date                DATE          NOT NULL,
    end_date                  DATE          NOT NULL,

    -- => ongoing: class is currently running
    -- => concluded: all discussions done, certificates given
    -- => upcoming: class is set up but hasn't started yet
    status                    VARCHAR(15)   NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'concluded')),

    -- => Minimum students required before class can begin
    required_number_of_students INT         NOT NULL,

    -- => Maximum slots available — remaining slots computed from this minus enrolled count
    max_students              INT           NOT NULL,

    -- => Which admin created this class
    created_by                INT           REFERENCES admins(admin_id) ON DELETE SET NULL,

    updated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    -- => Admin notes, delays, announcements, etc.
    remarks                   TEXT          DEFAULT NULL
  );`

  ;

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