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
import enrollmentRoutes from './routes/enrollmentRoutes.js';
import documentRoutes from './routes/documentRoutes.js';

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


// => Enrollment submission route
app.use('/api/enrollment', enrollmentRoutes);

// => Document proxy route - serves R2 files through auth-gated Express endpoint
// => Raw R2 URLs are never exposed to the browser
app.use('/api/documents', documentRoutes);



async function initDB () {
  try {

    await sql`
      CREATE TABLE IF NOT EXISTS student_accounts (
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
          SELECT 1 FROM pg_trigger WHERE tgname = 'student_accounts_set_updated_at'
        ) THEN
          CREATE TRIGGER student_accounts_set_updated_at
          BEFORE UPDATE ON student_accounts
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
          ALTER TABLE student_accounts
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
      -- => maps_url: Google Maps or any map URL to guide students to the branch
      -- => created_at / updated_at: audit timestamps

      CREATE TABLE IF NOT EXISTS branches (
        branch_id    SERIAL PRIMARY KEY,
        branch_name  VARCHAR(150)  NOT NULL,
        address      TEXT          NOT NULL,
        office_hours JSONB         NOT NULL DEFAULT '{}',
        is_active    BOOLEAN       NOT NULL DEFAULT TRUE,
        maps_url     TEXT          DEFAULT NULL,
        created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
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

    -- => Maximum slots available - remaining slots computed from this minus enrolled count
    max_students              INT           NOT NULL,

    -- => Which admin created this class
    created_by                INT           REFERENCES admins(admin_id) ON DELETE SET NULL,

    updated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    -- => Admin notes, delays, announcements, etc.
    remarks                   TEXT          DEFAULT NULL
  );`

  await sql`
    CREATE TABLE IF NOT EXISTS student_profile (
      profile_id                      BIGSERIAL PRIMARY KEY,
      student_id                      BIGINT        NOT NULL REFERENCES student_accounts(student_id) ON DELETE CASCADE,
      uli                             VARCHAR(50)   NULL,
      surname                         VARCHAR(100)  NOT NULL,
      first_name                      VARCHAR(100)  NOT NULL,
      middle_name                     VARCHAR(100)  NULL,
      name_extension                  VARCHAR(20)   NULL,
      mother_name                     VARCHAR(150)  NOT NULL,
      father_name                     VARCHAR(150)  NOT NULL,
      birthdate                       DATE          NOT NULL,
      birthplace_region               VARCHAR(20)   NOT NULL,
      birthplace_province             VARCHAR(20)   NULL,
      birthplace_city_or_municipality VARCHAR(20)   NOT NULL,
      nationality                     VARCHAR(100)  NOT NULL,
      sex                             VARCHAR(10)   NOT NULL CHECK (sex IN ('m', 'f')),
      civil_status                    VARCHAR(30)   NOT NULL,
      highest_educational_attainment  TEXT          NOT NULL,
      employment_status               VARCHAR(30)   NOT NULL,
      client_type                     VARCHAR(50)   NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS student_address (
      address_id    BIGSERIAL PRIMARY KEY,
      profile_id    BIGINT       NOT NULL REFERENCES student_profile(profile_id) ON DELETE CASCADE,
      street        TEXT         NOT NULL,
      barangay_code VARCHAR(20)  NULL,
      district_code VARCHAR(20)  NULL,
      city_code     VARCHAR(20)  NULL,
      province_code VARCHAR(20)  NULL,
      region_code   VARCHAR(20)  NOT NULL,
      zip_code      VARCHAR(10)  NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS contact_numbers (
      contact_id    BIGSERIAL PRIMARY KEY,
      profile_id    BIGINT       NOT NULL REFERENCES student_profile(profile_id) ON DELETE CASCADE,
      contact_type  VARCHAR(20)  NOT NULL,
      contact_value VARCHAR(50)  NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS contact_person (
      contact_person_id   BIGSERIAL PRIMARY KEY,
      profile_id          BIGINT       NOT NULL REFERENCES student_profile(profile_id) ON DELETE CASCADE,
      contact_person_name VARCHAR(150) NOT NULL,
      contact_number      VARCHAR(20)  NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS licensure_examination (
      licensure_id      BIGSERIAL PRIMARY KEY,
      profile_id        BIGINT       NOT NULL REFERENCES student_profile(profile_id) ON DELETE CASCADE,
      title             VARCHAR(255) NOT NULL,
      year_taken        INT          NULL,
      examination_venue TEXT         NULL,
      rating            VARCHAR(50)  NULL,
      remarks           TEXT         NULL,
      expiry_date       DATE         NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS competency_assessment (
      competency_id       BIGSERIAL PRIMARY KEY,
      profile_id          BIGINT       NOT NULL REFERENCES student_profile(profile_id) ON DELETE CASCADE,
      title               VARCHAR(255) NOT NULL,
      qualification_level VARCHAR(50)  NULL,
      industry_sector     VARCHAR(100) NULL,
      certificate_number  VARCHAR(100) NULL,
      date_of_issuance    DATE         NULL,
      expiration_date     DATE         NULL
    )
  `;

  await sql`
    -- => status uses 'Pending' as default matching the service insert
    -- => fee_at_enrollment frozen at submission time - never updated after
    -- => branch_id stored directly so branch is always available even when class_id is NULL
    CREATE TABLE IF NOT EXISTS enrollment (
      enrollment_id     BIGSERIAL PRIMARY KEY,
      public_id         UUID          NOT NULL DEFAULT gen_random_uuid() UNIQUE,
      student_id        BIGINT        NOT NULL REFERENCES student_accounts(student_id) ON DELETE RESTRICT,
      course_id         INT           NULL REFERENCES courses(course_id) ON DELETE SET NULL,
      class_id          INT           NULL REFERENCES classes(class_id) ON DELETE SET NULL,
      branch_id         INT           NULL REFERENCES branches(branch_id) ON DELETE SET NULL,
      assessment_type   VARCHAR(50)   NULL,
      fee_at_enrollment NUMERIC(10,2) NULL,
      is_shs            BOOLEAN       NOT NULL DEFAULT FALSE,
      is_tesda_scholar  BOOLEAN       NOT NULL DEFAULT FALSE,
      status            VARCHAR(30)   NOT NULL DEFAULT 'Pending'
                        CHECK (status IN ('Pending','Approved','Needs Clarification','Rejected','Dropped','Completed','Reserved')),
      submitted_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS work_experience (
      work_id            BIGSERIAL PRIMARY KEY,
      enrollment_id      BIGINT        NOT NULL REFERENCES enrollment(enrollment_id) ON DELETE CASCADE,
      company            VARCHAR(255)  NOT NULL,
      position           VARCHAR(150)  NULL,
      salary             NUMERIC(10,2) NULL,
      date_from          DATE          NULL,
      date_to            DATE          NULL,
      appointment_status VARCHAR(50)   NULL,
      years_exp          INT           NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS training_seminar (
      training_id   BIGSERIAL PRIMARY KEY,
      enrollment_id BIGINT       NOT NULL REFERENCES enrollment(enrollment_id) ON DELETE CASCADE,
      title         VARCHAR(255) NOT NULL,
      venue         TEXT         NULL,
      date_from     DATE         NULL,
      date_to       DATE         NULL,
      hours         INT          NULL,
      conducted_by  VARCHAR(255) NULL
    )
  `;

  await sql`
    -- => enrollment_requirements holds the general required doc types (e.g. PSA, Valid ID)
    CREATE TABLE IF NOT EXISTS enrollment_requirements (
      enrollment_requirement_id SERIAL PRIMARY KEY,
      enrollment_requirement    VARCHAR(255) NOT NULL
    )
  `;

  await sql`
    -- => document_key stores the R2 object key (e.g. primeenroll/student-docs/birthCert_123.jpg)
    -- => Never stores a public URL - the proxy route resolves the key on demand
    CREATE TABLE IF NOT EXISTS enrollment_documents (
      document_id   BIGSERIAL PRIMARY KEY,
      enrollment_id BIGINT       NOT NULL REFERENCES enrollment(enrollment_id) ON DELETE CASCADE,
      document_type VARCHAR(100) NOT NULL,
      document_key  TEXT         NOT NULL,
      uploaded_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    -- => document_key stores the R2 object key - same pattern as enrollment_documents
    CREATE TABLE IF NOT EXISTS student_docs (
      document_id   BIGSERIAL PRIMARY KEY,
      student_id    BIGINT       NOT NULL REFERENCES student_accounts(student_id) ON DELETE CASCADE,
      document_type VARCHAR(100) NOT NULL,
      document_key  TEXT         NOT NULL,
      uploaded_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
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