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

// => Required when deployed behind a reverse proxy (Render, Railway, etc.)
// => so req.ip reflects the real client IP from X-Forwarded-For, not the
// => proxy's own IP. Without this, ALL visitors share one rate-limit bucket.
// app.set('trust proxy', 1); => not to be used just yet since I'm still testing locally without a proxy, but will be needed in production for rate limiting to work correctly.



async function initDB () {
  try {

    await sql`
      CREATE TABLE IF NOT EXISTS student_accounts (
        -- => Internal DB key: auto-increments (1, 2, 3...), never exposed outside the server
        student_id          BIGSERIAL PRIMARY KEY,

        -- => Public-facing ID: used in URLs and API responses instead of student_id
        public_id           UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,

        -- => Username is the student's email address; must be unique across all accounts
        username            VARCHAR(255) UNIQUE,

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

    // => username made nullable to support enrollees without email
    // => A student account is only created if the enrollee provides an email and opts in
    // => Safe to run repeatedly: only fires if the column is still NOT NULL
    await sql`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'student_accounts' AND column_name = 'username'
          AND is_nullable = 'NO'
        ) THEN
          ALTER TABLE student_accounts ALTER COLUMN username DROP NOT NULL;
        END IF;
      END $$
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
    await sql`
      -- => branch_id: auto-incrementing primary key
      -- => branch_name: display name of the branch
      -- => address: full address string
      -- => office_hours: JSONB so you can store structured per-day schedules
      -- => is_active: soft toggle to hide/show branches without deleting
      -- => maps_url: Google Maps or any map URL to guide students to the branch
      -- => created_at / updated_at: audit timestamps
      -- => branch_name tightened from VARCHAR(150) to VARCHAR(100) - no center name realistically exceeds this

      CREATE TABLE IF NOT EXISTS branches (
        branch_id    SERIAL       PRIMARY KEY,
        branch_name  VARCHAR(100) NOT NULL,
        address      TEXT         NOT NULL,
        office_hours JSONB        NOT NULL DEFAULT '{}',
        is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
        maps_url     TEXT         DEFAULT NULL,
        created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `;

    // courses parts
    await sql`
      -- => sectors: TESDA industry sectors (e.g. ICT, Agriculture, Construction)
      CREATE TABLE IF NOT EXISTS sectors (
        sector_id  SERIAL       PRIMARY KEY,
        sector     VARCHAR(150) NOT NULL
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS courses (
        course_id        SERIAL         PRIMARY KEY,
        title            VARCHAR(255)   NOT NULL,
        description      TEXT,

        -- => TESDA accreditation details per course
        accreditation_no VARCHAR(100)   NOT NULL,
        date_accredited  DATE           NOT NULL,
        expiration_date  DATE           NOT NULL,

        sector_id        INT            REFERENCES sectors(sector_id) ON DELETE SET NULL,

        -- => Default fee => copied to fee_at_enrollment during enrollment, not used for live balance
        amount           NUMERIC(10,2)  NOT NULL DEFAULT 0.00,

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
      )
    `;

    await sql`
      -- => Basic competencies are common across all TESDA qualifications
      CREATE TABLE IF NOT EXISTS basic_competency (
        basic_id   SERIAL      PRIMARY KEY,
        course_id  INT         NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
        code       VARCHAR(50) NOT NULL,
        competency TEXT        NOT NULL
      )
    `;

    await sql`
      -- => Common competencies are sector-specific, shared across courses in the same sector
      CREATE TABLE IF NOT EXISTS common_competency (
        common_id  SERIAL      PRIMARY KEY,
        course_id  INT         NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
        code       VARCHAR(50) NOT NULL,
        competency TEXT        NOT NULL
      )
    `;

    await sql`
      -- => Core competencies are unique to each specific qualification
      CREATE TABLE IF NOT EXISTS core_competency (
        core_id    SERIAL      PRIMARY KEY,
        course_id  INT         NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
        code       VARCHAR(50) NOT NULL,
        competency TEXT        NOT NULL
      )
    `;

    await sql`
      -- => Junction table => one row per branch that offers a course
      -- => UNIQUE constraint prevents the same course being added to the same branch twice
      CREATE TABLE IF NOT EXISTS course_branch (
        course_branch_id SERIAL PRIMARY KEY,
        course_id        INT    NOT NULL REFERENCES courses(course_id)   ON DELETE CASCADE,
        branch_id        INT    NOT NULL REFERENCES branches(branch_id)  ON DELETE CASCADE,
        UNIQUE (course_id, branch_id)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS national_certification_types (
        certification_id   SERIAL       PRIMARY KEY,
        certification_type VARCHAR(100) NOT NULL
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS instructors (
        instructor_id        SERIAL       PRIMARY KEY,
        instructor_full_name VARCHAR(150) NOT NULL,
        contact_number       VARCHAR(20)  NOT NULL,

        -- => Nullable: not required now but reserved for future use
        email                VARCHAR(255) NULL,

        -- => Audit trail
        created_by           INT          REFERENCES admins(admin_id) ON DELETE SET NULL,
        created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS classes (
        class_id                    SERIAL      PRIMARY KEY,

        instructor_id               INT         REFERENCES instructors(instructor_id) ON DELETE SET NULL,
        course_id                   INT         NOT NULL REFERENCES courses(course_id)  ON DELETE CASCADE,
        branch_id                   INT         NOT NULL REFERENCES branches(branch_id) ON DELETE CASCADE,

        -- => Date only, no time component needed
        start_date                  DATE        NOT NULL,
        end_date                    DATE        NOT NULL,

        -- => Ongoing: class is currently running
        -- => Concluded: all discussions done, certificates given
        -- => Planned: class is set up but hasn't started yet
        status                      VARCHAR(15) NOT NULL DEFAULT 'Planned' CHECK (status IN ('Planned', 'Ongoing', 'Concluded')),

        -- => Minimum students required before class can begin
        required_number_of_students INT         NOT NULL,

        -- => Maximum slots available - remaining slots computed from this minus enrolled count
        max_students                INT         NOT NULL,

        -- => Which admin created this class
        created_by                  INT         REFERENCES admins(admin_id) ON DELETE SET NULL,

        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        -- => Messenger groupchat link for this batch/class
        -- => NULL on class creation; admin updates this once the groupchat is set up
        -- => Pulling this via the class relationship covers all enrolled students automatically
        groupchat_link               TEXT        DEFAULT NULL,

        -- => Admin notes, delays, announcements, etc.
        remarks                     TEXT        DEFAULT NULL
      )
    `;

    await sql`
      -- => student_profile: personal info from Step 1 + Step 2
      -- => Stores one profile per student account (1-to-1 with student_accounts)
      -- => birth_date stored as DATE for proper age computation in queries
      -- => facebook_link / email replace the old single email_or_facebook approach
      -- => birthplace stored as PSGC codes same as address fields
      CREATE TABLE IF NOT EXISTS student_profile (
        profile_id               SERIAL       PRIMARY KEY,
        student_id               BIGINT       NOT NULL REFERENCES student_accounts(student_id) ON DELETE CASCADE UNIQUE,

        -- => Step 1: Name fields
        last_name                VARCHAR(70)  NOT NULL,
        first_name               VARCHAR(70)  NOT NULL,
        middle_name              VARCHAR(70)  NULL,
        name_extension           VARCHAR(20)  NULL,

        -- => Step 1: Contact
        -- => facebook_link: used for groupchat coordination, required since even non-tech users typically have FB
        -- => email: optional; if provided, can be used to create a student dashboard account later
        contact_no               VARCHAR(11)  NOT NULL,
        facebook_link            TEXT         NULL,
        email                    VARCHAR(255) NULL,
        nationality              VARCHAR(60)  NOT NULL,

        -- => Step 2: Demographics
        sex                      VARCHAR(10)  NOT NULL CHECK (sex IN ('Male', 'Female')),
        civil_status             VARCHAR(30)  NOT NULL,
        employment_status        VARCHAR(30)  NOT NULL,

        -- => Step 2: Birthdate - stored as a proper DATE for age queries
        birth_date                          DATE         NOT NULL,

        -- => Step 2: Birthplace - PSGC codes, province nullable for NCR
        birthplace_region        VARCHAR(20)  NOT NULL,
        birthplace_province      VARCHAR(20)  NULL,
        birthplace_city          VARCHAR(20)  NOT NULL,

        -- => Step 2: Education
        highest_educ_attainment  VARCHAR(60)  NOT NULL,

        created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      -- => Attach updated_at trigger to student_profile
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'student_profile_set_updated_at'
        ) THEN
          CREATE TRIGGER student_profile_set_updated_at
          BEFORE UPDATE ON student_profile
          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        END IF;
      END $$
    `;

    await sql`
      -- => student_address: Step 1 address fields
      -- => Stores PSGC codes - names resolved on read via location API
      -- => district_code auto-filled from city selection, may be null if not in PSGC
      -- => province_code nullable to handle NCR (no province level)
      CREATE TABLE IF NOT EXISTS student_address (
        address_id        SERIAL      PRIMARY KEY,
        student_id        BIGINT      NOT NULL REFERENCES student_accounts(student_id) ON DELETE CASCADE UNIQUE,
        street            TEXT        NOT NULL,
        barangay_code     VARCHAR(20) NOT NULL,
        city_code         VARCHAR(20) NOT NULL,
        province_code     VARCHAR(20) NULL,
        district_code     VARCHAR(20) NULL,
        region_code       VARCHAR(20) NOT NULL
      )
    `;

    await sql`
      -- => student_guardian: Step 2 parent/guardian fields
      -- => Only inserted when the student is a minor (under 18) at time of enrollment
      -- => guardian_address is optional per MIS 03-01 2018
      CREATE TABLE IF NOT EXISTS student_guardian (
        guardian_id        SERIAL       PRIMARY KEY,
        student_id         BIGINT       NOT NULL REFERENCES student_accounts(student_id) ON DELETE CASCADE UNIQUE,
        guardian_name      VARCHAR(150) NOT NULL,
        guardian_address   TEXT         NULL
      )
    `;

    await sql`
      -- => tesda_enrollments: core TESDA enrollment transaction record
      -- => One row per enrollment submission
      -- => fee_at_enrollment frozen at submit time - never updated after
      -- => ncae_* fields from Step 4; nullable since ncae_taken can be 'no'
      -- => scholarship fields from Step 5
      CREATE TABLE IF NOT EXISTS tesda_enrollments (
        enrollment_id         SERIAL        PRIMARY KEY,
        public_id             UUID          NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        student_id            BIGINT        NOT NULL REFERENCES student_accounts(student_id) ON DELETE RESTRICT,
        branch_id             INT           NULL REFERENCES branches(branch_id)  ON DELETE SET NULL,
        course_id             INT           NULL REFERENCES courses(course_id)   ON DELETE SET NULL,
        class_id              INT           NULL REFERENCES classes(class_id)    ON DELETE SET NULL,
        fee_at_enrollment     NUMERIC(10,2) NULL,

        -- => Step 4: NCAE / YP4SC
        ncae_taken            BOOLEAN       NOT NULL DEFAULT FALSE,
        ncae_where            TEXT          NULL,
        ncae_when             VARCHAR(50)   NULL,

        -- => Step 5: Scholarship
        is_tesda_scholar      BOOLEAN       NOT NULL DEFAULT FALSE,
        scholarship_type      VARCHAR(50)   NULL,
        other_scholarship     TEXT          NULL,

        -- => Enrollment lifecycle status
        status                VARCHAR(30)   NOT NULL DEFAULT 'Pending'
                              CHECK (status IN ('Pending', 'Approved', 'Needs Clarification', 'Rejected', 'Dropped', 'Completed', 'Reserved')),

        submitted_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      -- => Attach updated_at trigger to tesda_enrollments
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'tesda_enrollments_set_updated_at'
        ) THEN
          CREATE TRIGGER tesda_enrollments_set_updated_at
          BEFORE UPDATE ON tesda_enrollments
          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        END IF;
      END $$
    `;

    await sql`
      -- => tesda_client_classifications: Step 3 checkboxes
      -- => One row per selected classification per enrollment
      -- => Replaces the old single client_type column in student_profile
      -- => others_text only populated when classification_value = 'others'
      CREATE TABLE IF NOT EXISTS tesda_client_classifications (
        classification_id      SERIAL       PRIMARY KEY,
        enrollment_id          INT          NOT NULL REFERENCES tesda_enrollments(enrollment_id) ON DELETE CASCADE,
        classification_value   VARCHAR(60)  NOT NULL,
        others_text            TEXT         NULL
      )
    `;

    await sql`
      -- => enrollment_requirements holds the general required doc types (e.g. PSA, Valid ID)
      -- => Wired up but not yet used in services - reserved for admin configuration of required docs per course
      CREATE TABLE IF NOT EXISTS enrollment_requirements (
        enrollment_requirement_id SERIAL       PRIMARY KEY,
        enrollment_requirement    VARCHAR(255) NOT NULL
      )
    `;

    await sql`
      -- => enrollment_documents: Step 5 file uploads
      -- => document_key stores the R2 object key (e.g. primeenroll/student-docs/birthCert_123.jpg)
      -- => Never stores a public URL - the proxy route resolves the key on demand
      -- => Wired to tesda_enrollments instead of the old enrollment table
      CREATE TABLE IF NOT EXISTS enrollment_documents (
        document_id     SERIAL       PRIMARY KEY,
        public_id          UUID         NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        enrollment_id   INT          NOT NULL REFERENCES tesda_enrollments(enrollment_id) ON DELETE CASCADE,
        document_type   VARCHAR(100) NOT NULL,
        document_key    TEXT         NOT NULL,
        uploaded_at     IMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      -- => student_docs: student-level documents (not tied to a specific enrollment)
      -- => Same pattern as enrollment_documents but scoped to the student account
      CREATE TABLE IF NOT EXISTS student_docs (
        document_id      SERIAL       PRIMARY KEY,
        student_id       BIGINT       NOT NULL REFERENCES student_accounts(student_id) ON DELETE CASCADE,
        public_id        UUID         NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        document_type    VARCHAR(100) NOT NULL,
        document_key     TEXT         NOT NULL,
        uploaded_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
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