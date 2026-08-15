// publict site & student dashboard server.js

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

import tesdaCourseRoutes from "./routes/TESDAEnrollment/tesdaCourseRoutes.js";
import tesdaCoursesRoutes from './routes/Courses/tesdaCoursesRoutes.js';
// => Note the "s" - tesdaCoursesRoutes (public catalog) is separate from
// => tesdaCourseRoutes (enrollment form dropdown), different mount points
import shsCoursesRoutes from './routes/Courses/shsCoursesRoutes.js';
// => Public SHS course catalog - list + detail-by-title, separate from
// => /api/shs-clusters which only returns a cluster's curriculum for
// => the enrollment form, not individual course browsing
import tesdaBatchRoutes from "./routes/TESDAEnrollment/tesdaBatchRoutes.js";

import publicSupportTicketRoutes from './routes/PublicSupportTicket/publicSupportTicketRoutes.js';
// => Public, anonymous support ticket submissions - no auth required, and
// => intentionally separate from the private, student-scoped support_tickets table
import studentSupportTicketRoutes from "./routes/StudentSupportTicket/studentSupportTicketRoutes.js";

import shsBatchesRouter from './routes/SHSEnrollment/shsBatchRoutes.js';
// => Renamed from shsCourses -> shsClusters: SHS students enroll into a
// => cluster, not an individual course - this route now returns a
// => cluster's G11/G12 curriculum for display, not a selectable list
import shsClustersRoute from './routes/SHSEnrollment/shsClusterRoutes.js';
// => Enrollment routes split into shared (combined my-enrollments/detail),
//    tesda-only (submit), and shs-only (submit-shs) routers, and document
//    routes relocated alongside them - see routes/Enrollments/
import sharedEnrollmentRoutes from './routes/Enrollments/sharedEnrollmentRoutes.js';
import tesdaEnrollmentRoutes from './routes/Enrollments/tesdaEnrollmentRoutes.js';
import shsEnrollmentRoutes from './routes/Enrollments/shsEnrollmentRoutes.js';
import documentRoutes from './routes/Enrollments/documentRoutes.js';
// => Student Account settings - profile/address edit + password reset.
//    Own top-level folder since it isn't enrollment-specific and, unlike
//    every other student route, it's WRITE-capable.
import accountRoutes from './routes/Account/accountRoutes.js';
// => Read-only student class schedule (Approved enrollments only) - mounted
//    under /api/student-classes since /api/classes and /api/shs-classes
//    are already taken by the enrollment-form batch pickers
import classesRoutes from './routes/Classes/classesRoutes.js';

// Payments
// => Read-only student payment/refund history - students can view but
//    never create, edit, or void records. Own prefix since payments
//    are not scoped under enrollment or classes routes.
import paymentsRoutes from './routes/Payments/paymentsRoutes.js';



// Public Pages (Privacy Policy + FAQs)
// => Read-only, no auth - reads from the same cms_pages / faqs_sections /
//    faqs tables the admin side writes to, via the shared Neon DB
import cmsPageRoutes from './routes/Pages/cmsPageRoutes.js';
import faqRoutes from './routes/Pages/faqRoutes.js';

// Announcements (Student Dashboard feed)
import announcementRoutes from './routes/Announcements/announcementRoutes.js';

// => Student's own activity log history, read-only, strictly scoped to
// => actor_type = 'Student' AND actor_id = this student in the model layer
import studentLogsRoutes from './routes/Logs/logsRoutes.js';

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

// => Register TESDA courses route
app.use("/api/courses", tesdaCourseRoutes);
// => Public TESDA course catalog - list + detail-by-title, separate from
// => /api/courses which only feeds the enrollment form's course dropdown
app.use('/api/public/tesda-courses', tesdaCoursesRoutes);
// => Public SHS course catalog, mirrors the TESDA mount above
app.use('/api/public/shs-courses', shsCoursesRoutes);
// => Register TESDA batches route - path stays /api/classes so the
// => frontend's existing fetch calls don't need to change

// => Public support ticket submission - anonymous, no student_id involved
app.use('/api/public/support-tickets', publicSupportTicketRoutes);
app.use("/api/student/support-tickets", studentSupportTicketRoutes);

app.use("/api/classes", tesdaBatchRoutes);
// => Register SHS batches route - renamed from shs-classes to match the
// => shs_classes -> shs_batches table rename
app.use("/api/shs-batches", shsBatchesRouter);
// => Register SHS courses route
app.use('/api/shs-clusters', shsClustersRoute);

// => Enrollment submission routes - three routers share the same
//    '/api/enrollment' mount point since their paths don't overlap
//    (/submit is TESDA-only, /submit-shs is SHS-only, and the shared
//    router only owns /my-enrollments and /:publicId). This keeps every
//    existing frontend URL identical to before the split.
app.use('/api/enrollment', sharedEnrollmentRoutes);
app.use('/api/enrollment', tesdaEnrollmentRoutes);
app.use('/api/enrollment', shsEnrollmentRoutes);

// => Student class schedule - read-only, students can view but never
//    modify scheduling. Own prefix to avoid colliding with the
//    enrollment-form batch pickers at /api/classes and /api/shs-classes.
app.use('/api/student-classes', classesRoutes);

// => Document proxy route - serves R2 files through auth-gated Express endpoint
// => Raw R2 URLs are never exposed to the browser
// => Moved into routes/Enrollments/ alongside enrollment routes since
//    documents are always fetched across both enrollment types together
app.use('/api/documents', documentRoutes);

// => Student Account settings - the first WRITE-capable student routes,
//    everything else on the student side is read-only. GET returns the
//    combined profile+address view, PATCH handles the two separate forms.
app.use('/api/account', accountRoutes);

// => Required when deployed behind a reverse proxy (Render, Railway, etc.)
// => so req.ip reflects the real client IP from X-Forwarded-For, not the
// => proxy's own IP. Without this, ALL visitors share one rate-limit bucket.
// app.set('trust proxy', 1); => not to be used just yet since I'm still testing locally without a proxy, but will be needed in production for rate limiting to work correctly.

// payments 
app.use('/api/payments', paymentsRoutes);



// => Public Pages - Privacy Policy (by slug) and FAQs, read-only, no auth
app.use('/api/public/pages', cmsPageRoutes);
app.use('/api/public/faqs', faqRoutes);

app.use('/api/announcements', announcementRoutes);

app.use('/api/student/logs', studentLogsRoutes);

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

    // => is_email_confirmed removed: ownership of the email is proven by
    // => the student clicking the emailed set-password link itself, so a
    // => separate confirmation flag was redundant. Safe to run repeatedly.
    await sql`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'student_accounts' AND column_name = 'is_email_confirmed'
        ) THEN
          ALTER TABLE student_accounts DROP COLUMN is_email_confirmed;
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

    // => chk_password_requires_confirmed_email removed along with
    // => is_email_confirmed - the constraint referenced that column, so it
    // => can't exist anymore either. This migration drops it in any
    // => environment where it was already created before the column
    // => removal (e.g. production). Harmless no-op if it was never created.
    await sql`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'chk_password_requires_confirmed_email'
        ) THEN
          ALTER TABLE student_accounts
          DROP CONSTRAINT chk_password_requires_confirmed_email;
        END IF;
      END $$
    `;

    // => student_address.student_id was declared UNIQUE in this file's
    // => CREATE TABLE text from the start, but that text only applies to
    // => a freshly created table - the live table predates it and never
    // => actually got the constraint. accountModel.js's upsertAddress()
    // => relies on ON CONFLICT (student_id), which requires this to exist.
    await sql`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'student_address_student_id_key'
        ) THEN
          ALTER TABLE student_address
          ADD CONSTRAINT student_address_student_id_key UNIQUE (student_id);
        END IF;
      END $$
    `;

    // courses parts
    await sql`
      -- => sectors: TESDA industry sectors (e.g. ICT, Agriculture, Construction)
      CREATE TABLE IF NOT EXISTS sectors (
        sector_id  SERIAL       PRIMARY KEY,
        sector     VARCHAR(150) NOT NULL,
        deleted_at TIMESTAMPTZ  NULL
      )
    `;

    // => national_certification_types - exists live in Neon but was never
    //    mirrored here (created directly via SQL Editor, per your note).
    //    Reconstructed minimally from tesda_courses' FK reference only -
    //    if the real table has more columns, this IF NOT EXISTS won't add
    //    them (per your own rule: it no-ops silently on existing tables).
    //    Confirm this matches, or send the real columns and I'll correct it.
    await sql`
        CREATE TABLE IF NOT EXISTS national_certification_types (
            certification_id SERIAL PRIMARY KEY,
            name VARCHAR(150) NOT NULL
        )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS tesda_courses (
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
        course_id  INT         NOT NULL REFERENCES tesda_courses(course_id) ON DELETE CASCADE,
        code       VARCHAR(50) NOT NULL,
        competency TEXT        NOT NULL
      )
    `;

    await sql`
      -- => Common competencies are sector-specific, shared across courses in the same sector
      CREATE TABLE IF NOT EXISTS common_competency (
        common_id  SERIAL      PRIMARY KEY,
        course_id  INT         NOT NULL REFERENCES tesda_courses(course_id) ON DELETE CASCADE,
        code       VARCHAR(50) NOT NULL,
        competency TEXT        NOT NULL
      )
    `;

    await sql`
      -- => Core competencies are unique to each specific qualification
      CREATE TABLE IF NOT EXISTS core_competency (
        core_id    SERIAL      PRIMARY KEY,
        course_id  INT         NOT NULL REFERENCES tesda_courses(course_id) ON DELETE CASCADE,
        code       VARCHAR(50) NOT NULL,
        competency TEXT        NOT NULL
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS tesda_job_opportunities (
        job_id     SERIAL       PRIMARY KEY,
        course_id  INT          NOT NULL REFERENCES tesda_courses(course_id) ON DELETE CASCADE,
        job_title  VARCHAR(150) NOT NULL
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS shs_job_opportunities (
        job_id     SERIAL       PRIMARY KEY,
        course_id  INT          NOT NULL REFERENCES shs_courses(course_id) ON DELETE CASCADE,
        job_title  VARCHAR(150) NOT NULL
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS national_certification_types (
        certification_id   SERIAL       PRIMARY KEY,
        certification_type VARCHAR(100) NOT NULL
      )
    `;

    await sql`
      -- => Updated to match live Neon schema: status/deleted_at/remarks follow the
      -- => same pattern as facilities, so RemarksActionModal works identically for
      -- => both. handles_tesda/handles_shs gate which course checklist(s) show up
      -- => in the admin form, and which join table(s) get rows for this instructor.
      CREATE TABLE IF NOT EXISTS trainers (
        trainer_id        SERIAL       PRIMARY KEY,
        public_id            UUID         NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        trainer_full_name VARCHAR(150) NOT NULL,
        contact_number       VARCHAR(20)  NOT NULL,

        -- => Nullable: not required now but reserved for future use
        email                VARCHAR(255) NULL,

        -- => day-to-day active/inactive, reversible - separate concern from deleted_at
        status                VARCHAR(20)  NOT NULL DEFAULT 'active',

        -- => soft delete, restorable - NULL means not deleted
        deleted_at            TIMESTAMPTZ  NULL,

        -- => last saved status-change / delete reason, overwritten each time
        remarks               TEXT         NULL,

        -- => can this instructor be assigned to TESDA courses, SHS courses, or both
        handles_tesda         BOOLEAN      NOT NULL DEFAULT FALSE,
        handles_shs           BOOLEAN      NOT NULL DEFAULT FALSE,

        -- => Audit trail
        created_by           INT          REFERENCES admins(admin_id) ON DELETE SET NULL,
        created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        -- => Who last edited this trainer - shown as "Last Updated By" on TrainerDetail
        updated_by           INT          REFERENCES admins(admin_id) ON DELETE SET NULL
      )
    `;

    await sql`
      -- => Which TESDA courses a trainer is qualified to handle.
      -- => Mirrors facility_tesda_courses - course-level, not sector-level.
      -- => Renamed from instructor_tesda_courses as part of the
      -- => Instructor -> Trainer rename
      CREATE TABLE IF NOT EXISTS trainer_tesda_courses (
        trainer_id INTEGER NOT NULL REFERENCES trainers(trainer_id) ON DELETE CASCADE,
        course_id  INTEGER NOT NULL REFERENCES tesda_courses(course_id) ON DELETE CASCADE,
        PRIMARY KEY (trainer_id, course_id)
      )
    `;

    await sql`
      -- => Renamed from tesda_classes: stakeholders say "batch," not "class"
      CREATE TABLE IF NOT EXISTS tesda_batches (
        batch_id                    SERIAL      PRIMARY KEY,
        public_id                   UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,

        -- => Renamed from instructor_id as part of the Instructor -> Trainer rename
        trainer_id                  INT         REFERENCES trainers(trainer_id) ON DELETE SET NULL,
        course_id                   INT         NOT NULL REFERENCES tesda_courses(course_id)  ON DELETE CASCADE,

        -- => Date only, no time component needed
        -- => Both nullable: start_date is unknown while status = 'Pending' and
        -- => a firm date hasn't been set yet; end_date stays open while
        -- => status = 'Ongoing' since the class may be extended
        start_date                  DATE        NULL,
        end_date                    DATE        NULL,

        -- => Ongoing: class is currently running
        -- => Concluded: all discussions done, certificates given
        -- => Pending: class is set up but hasn't started yet
        -- => Dissolved: batch called off mid-enrollment - admin notifies
        -- => enrolled students manually (e.g. via Messenger)
        status                      VARCHAR(15) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Ongoing', 'Concluded', 'Dissolved')),

        -- => Regular: paid by the enrollee - TESDA-Sponsored: paid by TESDA
        class_type                  VARCHAR(20) NOT NULL DEFAULT 'Regular' CHECK (class_type IN ('Regular', 'TESDA-Sponsored')),

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

    // => shs_batches: SHS's equivalent of tesda_batches, but keyed by
    // => cluster instead of course_id, since SHS enrollees pick a
    // => cluster, not a TESDA course. No instructor_id for now -
    // => flagged as an open question, easy to ALTER in later if needed.
    // => track column removed: only one track is offered, and it was
    // => dropped from scope entirely per the thesis adviser's direction.
    await sql`
      CREATE TABLE IF NOT EXISTS shs_batches (
        batch_id      SERIAL      PRIMARY KEY,
        public_id     UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,

        -- => Legacy free-text cluster label - superseded by cluster_id
        -- => below. Kept only because older rows still populate it; new
        -- => code should never read/write this column.
        cluster       VARCHAR(60) NOT NULL,

        -- => cluster_id: proper FK, replaces the free-text cluster column above
        cluster_id    INT         NOT NULL REFERENCES shs_clusters(cluster_id) ON DELETE RESTRICT,

        -- => Always-incrementing per cluster, never reused after dissolution -
        -- => powers batch_name below (e.g. "Batch 3")
        batch_sequence INT        NOT NULL,
        batch_name    VARCHAR(150) NOT NULL,

        -- => Two trainer slots instead of one instructor_id: a batch spans
        -- => both grade levels at once, and a trainer's TESDA-style
        -- => qualification is grade-specific (trainer_shs_courses joins
        -- => through shs_courses.grade_level), so one FK can't represent it
        grade11_trainer_id INT REFERENCES trainers(trainer_id) ON DELETE SET NULL,
        grade12_trainer_id INT REFERENCES trainers(trainer_id) ON DELETE SET NULL,

        -- => Flips true once Grade 11 finishes, used by the cron
        -- => auto-promotion job to roll the batch into Grade 12
        grade11_completed BOOLEAN NOT NULL DEFAULT FALSE,

        school_year   VARCHAR(20) NOT NULL,
        -- => Both nullable - same reasoning as tesda_classes: start_date
        -- => unknown while Pending, end_date open while Ongoing
        start_date    DATE        NULL,
        end_date      DATE        NULL,

        -- => Dissolved: batch called off mid-enrollment - admin notifies
        -- => enrolled students manually (e.g. via Messenger)
        status        VARCHAR(15) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Ongoing', 'Concluded', 'Dissolved')),

        -- => Minimum students required before batch can begin - matches
        -- => tesda_batches for consistency
        required_number_of_students INT NOT NULL,
        max_students  INT         NOT NULL,

        created_by    INT         REFERENCES admins(admin_id) ON DELETE SET NULL,
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        -- => Messenger groupchat link for this SHS section - same pattern as tesda_classes
        groupchat_link TEXT       DEFAULT NULL,

        remarks       TEXT        DEFAULT NULL
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
        -- => email: required as of [today's date] - both TESDA and SHS now collect it explicitly (TESDA used to have a single dual-purpose "email or FB name" field, which is why old rows may hold a placeholder)
        contact_no               VARCHAR(11)  NOT NULL,
        facebook_link            TEXT         NOT NULL,
        email                    VARCHAR(255) NOT NULL,
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

        -- => Religion: religion_others holds free text when religion = 'Others'
        religion                 VARCHAR(60)  NULL,
        religion_others          VARCHAR(100) NULL,

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
        guardian_name        VARCHAR(150) NOT NULL,
        guardian_address     TEXT         NULL,
        guardian_contact_no  VARCHAR(11)  NOT NULL
      )
    `;

    await sql`
      -- => tesda_enrollments: core TESDA enrollment transaction record
      -- => One row per enrollment submission
      -- => fee_at_enrollment frozen at submit time - never updated after
      -- => ncae_* fields from Step 4; nullable since ncae_taken can be 'no'
      -- => scholarship fields from Step 5
      -- => uli: TESDA Unique Learner Identifier - nullable, may not be known/issued at time of enrollment
      CREATE TABLE IF NOT EXISTS tesda_enrollments (
        enrollment_id         SERIAL        PRIMARY KEY,
        public_id             UUID          NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        student_id            BIGINT        NOT NULL REFERENCES student_accounts(student_id) ON DELETE RESTRICT,
        course_id             INT           NULL REFERENCES tesda_courses(course_id)   ON DELETE SET NULL,
        -- => Repointed from the now-retired legacy classes table to tesda_batches
        batch_id              INT           NULL REFERENCES tesda_batches(batch_id) ON DELETE SET NULL,
        fee_at_enrollment     NUMERIC(10,2) NULL,
        uli                   VARCHAR(20)   NULL,

        -- => Step 4: NCAE / YP4SC
        ncae_taken            BOOLEAN       NOT NULL DEFAULT FALSE,
        ncae_where            TEXT          NULL,
        ncae_when             VARCHAR(50)   NULL,

        -- => Step 5: Scholarship
        is_tesda_scholar      BOOLEAN       NOT NULL DEFAULT FALSE,
        scholarship_type      VARCHAR(50)   NULL,
        other_scholarship     TEXT          NULL,

        -- => Admin-entered notes
        -- => internal_remarks: staff-only, never shown to the student
        -- => external_remarks: shown/emailed to the student to explain a status decision
        internal_remarks      TEXT          NULL,
        external_remarks      TEXT          NULL,

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
      -- => tesda_documents (renamed from enrollment_documents): Step 5 file uploads
      -- => document_key stores the R2 object key (e.g. primeenroll/student-docs/birthCert_123.jpg)
      -- => Never stores a public URL - the proxy route resolves the key on demand
      -- => Wired to tesda_enrollments instead of the old enrollment table
      -- => Renamed to tesda_documents since SHS now gets its own shs_documents table
      CREATE TABLE IF NOT EXISTS tesda_documents (
        document_id     SERIAL       PRIMARY KEY,
        public_id       UUID         NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        enrollment_id   INT          NOT NULL REFERENCES tesda_enrollments(enrollment_id) ON DELETE CASCADE,
        document_type   VARCHAR(100) NOT NULL,
        document_key    TEXT         NOT NULL,
        -- => is_original: TRUE for docs submitted by the student at enrollment
        -- => time - locked from deletion for audit purposes, replace-only.
        -- => FALSE for docs an admin adds later - those CAN be deleted.
        is_original     BOOLEAN      NOT NULL DEFAULT TRUE,
        -- => fixed typo: was "IMESTAMPTZ" (missing leading T)
        uploaded_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `;

    // => shs_family_members: SHS Father/Mother/Guardian records
    // => ONE table with a role column instead of separate father_*/mother_*/
    // => guardian_* columns - each person gets their own row distinguished by `role`
    // => Keyed on student_id directly (shared identity, not per-enrollment) -
    // => family info doesn't change per school year the way enrollment details do
    // => UNIQUE(student_id, role) - a student can only have ONE row per role
    await sql`
      CREATE TABLE IF NOT EXISTS shs_family_members (
        family_member_id         SERIAL       PRIMARY KEY,
        student_id                BIGINT       NOT NULL REFERENCES student_accounts(student_id) ON DELETE CASCADE,
        role                      VARCHAR(20)  NOT NULL CHECK (role IN ('Father', 'Mother', 'Guardian')),
        full_name                 VARCHAR(150) NOT NULL,
        occupation                VARCHAR(150) NULL,
        contact_no                VARCHAR(11)  NULL,

        -- => Only meaningful for the Guardian role (physical form only asks
        -- => "Relationship to Student" for Guardian) - left nullable for
        -- => Father/Mother rows rather than splitting into another table
        relationship_to_student   VARCHAR(60)  NULL,

        UNIQUE (student_id, role)
      )
    `;

    // => Enforces: a student must have BOTH Father and Mother rows, OR a
    // => Guardian row alone - a single parent by themselves is not enough.
    // => This is a cross-row business rule, so a plain column CHECK can't
    // => express it - needs a trigger that looks at all of a student's rows.
    await sql`
      CREATE OR REPLACE FUNCTION check_shs_family_requirement()
      RETURNS TRIGGER AS $$
      DECLARE
        affected_student_id BIGINT;
        has_father BOOLEAN;
        has_mother BOOLEAN;
        has_guardian BOOLEAN;
      BEGIN
        affected_student_id := COALESCE(NEW.student_id, OLD.student_id);

        SELECT
          EXISTS (SELECT 1 FROM shs_family_members WHERE student_id = affected_student_id AND role = 'Father'),
          EXISTS (SELECT 1 FROM shs_family_members WHERE student_id = affected_student_id AND role = 'Mother'),
          EXISTS (SELECT 1 FROM shs_family_members WHERE student_id = affected_student_id AND role = 'Guardian')
        INTO has_father, has_mother, has_guardian;

        IF NOT ((has_father AND has_mother) OR has_guardian) THEN
          RAISE EXCEPTION 'Student % must have both Father and Mother, or a Guardian.', affected_student_id;
        END IF;

        RETURN NULL; -- => AFTER trigger - return value is ignored either way
      END;
      $$ LANGUAGE plpgsql
    `;

    await sql`
      -- => DEFERRABLE INITIALLY DEFERRED - this check only runs at COMMIT,
      -- => not after each individual row insert. Needed because the SHS
      -- => submission service inserts Father/Mother/Guardian rows one at a
      -- => time inside one transaction via 'pool' - without deferring, the
      -- => very first row insert would trip the check before the second
      -- => row ever gets a chance to land.
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'trg_check_shs_family_requirement'
        ) THEN
          CREATE CONSTRAINT TRIGGER trg_check_shs_family_requirement
          AFTER INSERT OR UPDATE OR DELETE ON shs_family_members
          DEFERRABLE INITIALLY DEFERRED
          FOR EACH ROW EXECUTE FUNCTION check_shs_family_requirement();
        END IF;
      END $$
    `;

    // => shs_clusters: normalized SHS cluster reference data, FK'd to its parent track
    // => value column dropped, name is now the sole identifying label
    await sql`
      CREATE TABLE IF NOT EXISTS shs_clusters (
        cluster_id  SERIAL       PRIMARY KEY,
        name        VARCHAR(150) NOT NULL,
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        deleted_at  TIMESTAMPTZ  NULL
      )
    `;

    // => shs_courses: SHS course catalog, mirrors the TESDA courses table
    // => but drops accreditation/fee/hours columns since SHS has neither concept
    await sql`
      CREATE TABLE IF NOT EXISTS shs_courses (
        course_id        SERIAL       PRIMARY KEY,
        cluster_id       INT          NOT NULL REFERENCES shs_clusters(cluster_id) ON DELETE RESTRICT,
        title            VARCHAR(255) NOT NULL,
        description      TEXT,
        cover_image_url  TEXT,

        -- => grade_level: a cluster is a fixed 2-year curriculum, not a
        -- => course the student picks between - every course row is tagged
        -- => G11 or G12 so the frontend can display "what you'll be taking
        -- => each year" instead of offering it as a selectable option
        grade_level       VARCHAR(10)  NOT NULL CHECK (grade_level IN ('Grade 11', 'Grade 12')),

        -- => course_link: optional external reference (e.g. DepEd curriculum
        -- => PDF) shown alongside the title/description, informational only
        course_link       TEXT         NULL,

        -- => 'active' courses are selectable on the public enrollment form;
        -- => 'inactive' hides them without breaking historical enrollment links
        status            VARCHAR(10)  NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),

        -- => Audit trail
        created_by        INT          REFERENCES admins(admin_id) ON DELETE SET NULL,
        created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

        -- => Soft-delete: NULL means active/not deleted
        deleted_at         TIMESTAMPTZ  NULL
      )
    `;

    // => shs_enrollments: core SHS enrollment transaction record
    // => Holds ONLY enrollment-specific data (academic history, track/
    // => cluster, emergency contact, health, consent) - identity/address
    // => fields live in the shared student_profile/student_address tables instead
    // => No branch_id - single-branch institution, no branch distinction.
    await sql`
      -- => lrn: DepEd Learner Reference Number - nullable, some incoming Grade 11
      -- => students may not have one recorded yet at time of enrollment
      CREATE TABLE IF NOT EXISTS shs_enrollments (
        enrollment_id             SERIAL        PRIMARY KEY,
        public_id                 UUID          NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        student_id                BIGINT        NOT NULL REFERENCES student_accounts(student_id) ON DELETE RESTRICT,
        lrn                       VARCHAR(12)   NULL,
        -- => Repointed from shs_classes to its renamed table shs_batches
        batch_id                  INT           NULL REFERENCES shs_batches(batch_id) ON DELETE SET NULL,

        -- => course_id: links to the shs_courses catalog entry chosen at enrollment
        -- => Nullable since enrollments predating the course catalog feature won't have one
        course_id                 INT           NULL REFERENCES shs_courses(course_id) ON DELETE SET NULL,

        -- => Academic Information
        last_school_attended      VARCHAR(150)   NOT NULL,
        school_address             TEXT          NOT NULL,
        grade_level_completed      VARCHAR(30)   NOT NULL,
        school_year_completed      VARCHAR(20)   NOT NULL,

        -- => Strengthened SHS Enrollment Details
        -- => cluster left WITHOUT a CHECK - values are already
        -- => NOT NULL: with track removed, cluster is the sole identifier
        cluster                    VARCHAR(60)   NOT NULL,
        electives                  TEXT          NULL,

        -- => Emergency Contact
        emergency_name             VARCHAR(150)  NOT NULL,
        emergency_relationship     VARCHAR(60)   NOT NULL,
        emergency_contact_no       VARCHAR(11)   NOT NULL,
        emergency_address          TEXT          NOT NULL,

        -- => Health Information
        has_medical_condition      VARCHAR(10)   NOT NULL CHECK (has_medical_condition IN ('none', 'yes')),
        medical_condition_detail   TEXT          NULL,
        allergies                  TEXT          NULL,
        maintenance_medication     TEXT          NULL,

        -- => Admin-entered notes
        -- => internal_remarks: staff-only, never shown to the student
        -- => external_remarks: shown/emailed to the student to explain a status decision
        internal_remarks           TEXT          NULL,
        external_remarks           TEXT          NULL,

        -- => Enrollment lifecycle status - same values/flow as tesda_enrollments
        status                     VARCHAR(30)   NOT NULL DEFAULT 'Pending'
                                   CHECK (status IN ('Pending', 'Approved', 'Needs Clarification', 'Rejected', 'Dropped', 'Completed', 'Reserved')),

        submitted_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at                 TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      -- => Attach updated_at trigger to shs_enrollments
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'shs_enrollments_set_updated_at'
        ) THEN
          CREATE TRIGGER shs_enrollments_set_updated_at
          BEFORE UPDATE ON shs_enrollments
          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        END IF;
      END $$
    `;

    // => shs_documents: SHS Step 2 file uploads
    // => Kept as its own separate table from tesda_documents per your
    // => direction - document_key stores the R2 object key, never a public URL
    await sql`
      CREATE TABLE IF NOT EXISTS shs_documents (
        document_id     SERIAL       PRIMARY KEY,
        public_id       UUID         NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        enrollment_id   INT          NOT NULL REFERENCES shs_enrollments(enrollment_id) ON DELETE CASCADE,
        document_type   VARCHAR(100) NOT NULL,
        document_key    TEXT         NOT NULL,
        -- => is_original: TRUE for docs submitted by the student at enrollment
        -- => time - locked from deletion for audit purposes, replace-only.
        -- => FALSE for docs an admin adds later - those CAN be deleted.
        is_original     BOOLEAN      NOT NULL DEFAULT TRUE,
        -- => fixed typo: was "IMESTAMPTZ" (missing leading T)
        uploaded_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
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

    await sql`
      -- => facilities was previously created live in Neon only, never
      -- => mirrored here - added now so a fresh deploy doesn't silently
      -- => fail when facility_shs_courses below tries to reference it
      CREATE TABLE IF NOT EXISTS facilities (
        facility_id         SERIAL        PRIMARY KEY,
        public_id           UUID          NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        name                VARCHAR(150)  NOT NULL,
        capacity            INTEGER       NULL,

        -- => true = usable for any course/cluster, no restriction rows needed
        allows_all_courses  BOOLEAN       NOT NULL DEFAULT FALSE,

        status              VARCHAR(20)   NOT NULL DEFAULT 'active',
        deleted_at          TIMESTAMPTZ   NULL,
        remarks             TEXT          NULL,

        created_by          INT           NOT NULL REFERENCES admins(admin_id) ON DELETE SET NULL,
        created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_by          INT           REFERENCES admins(admin_id) ON DELETE SET NULL
      );
    `

    await sql`
      -- => Which TESDA courses a facility is restricted to - mirrors
      -- => facility_shs_courses below, added alongside facilities since
      -- => this was also never mirrored here
      CREATE TABLE IF NOT EXISTS facility_tesda_courses (
        facility_id INTEGER NOT NULL REFERENCES facilities(facility_id) ON DELETE CASCADE,
        course_id   INTEGER NOT NULL REFERENCES tesda_courses(course_id) ON DELETE CASCADE,
        PRIMARY KEY (facility_id, course_id)
      );
    `

    await sql`
      -- => Replaces facility_shs_clusters with facility_shs_courses. Course-level
      --    restriction instead of cluster-level, since two courses in the same
      --    cluster (e.g. Cookery vs Housekeeping under Hospitality and Tourism)
      --    need different dedicated rooms.
      CREATE TABLE IF NOT EXISTS facility_shs_courses (
        facility_id INTEGER NOT NULL REFERENCES facilities(facility_id) ON DELETE CASCADE,
        course_id INTEGER NOT NULL REFERENCES shs_courses(course_id) ON DELETE CASCADE,
        PRIMARY KEY (facility_id, course_id)
      );
    `

    await sql`
      -- => Which SHS courses a trainer is qualified to handle.
      -- => Mirrors facility_shs_courses - has to come after shs_courses exists,
      -- => which is why this lives here instead of next to trainer_tesda_courses.
      -- => Renamed from instructor_shs_courses as part of the
      -- => Instructor -> Trainer rename
      CREATE TABLE IF NOT EXISTS trainer_shs_courses (
        trainer_id INTEGER NOT NULL REFERENCES trainers(trainer_id) ON DELETE CASCADE,
        course_id  INTEGER NOT NULL REFERENCES shs_courses(course_id) ON DELETE CASCADE,
        PRIMARY KEY (trainer_id, course_id)
      )
    `;

    await sql`
      -- => activity_logs: system-wide audit trail, not entity-specific.
      -- => entity_type/entity_id nullable - pure system events (login,
      -- => password reset) have no entity attached and leave both NULL.
      -- => actor_id has no FK - it can point at either admins.admin_id or
      -- => student_accounts.student_id depending on actor_type, and
      -- => Postgres can't express a conditional FK across two tables.
      -- => actor_name is a denormalized snapshot, kept accurate even if
      -- => the actor's name later changes or the account is deleted.
      CREATE TABLE IF NOT EXISTS activity_logs (
          log_id          SERIAL PRIMARY KEY,
          entity_type     VARCHAR(50),
          entity_id       INTEGER,
          actor_type      VARCHAR(15)   NOT NULL
                          CHECK (actor_type IN ('Admin', 'Student', 'System')),
          actor_id        INTEGER,
          actor_name      VARCHAR(150)  NOT NULL DEFAULT 'Unknown',
          action          TEXT          NOT NULL,
          action_detail   TEXT,
          created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_activity_logs_entity
      ON activity_logs (entity_type, entity_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at
      ON activity_logs (created_at DESC)
    `;

    // => Speeds up the student Logs page, which always filters by
    // => actor_type = 'Student' AND actor_id = studentId first, before
    // => any other filter is applied
    await sql`
      CREATE INDEX IF NOT EXISTS idx_activity_logs_actor
      ON activity_logs (actor_type, actor_id)
    `;

    await sql`
      -- => class_sessions was previously created live in Neon only, never
      -- => mirrored here. batch_type + batch_id are a polymorphic pair
      -- => (points at either tesda_batches or shs_batches) - no FK
      -- => constraint on batch_id since Postgres can't express a
      -- => conditional FK across two tables, same reasoning as
      -- => activity_logs.entity_type/entity_id above.
      CREATE TABLE IF NOT EXISTS class_sessions (
        session_id      SERIAL        PRIMARY KEY,
        public_id       UUID          NOT NULL DEFAULT gen_random_uuid() UNIQUE,

        batch_type      VARCHAR(10)   NOT NULL,
        batch_id        INTEGER       NOT NULL,

        session_type    VARCHAR(10)   NOT NULL,
        facility_id     INTEGER       NULL REFERENCES facilities(facility_id) ON DELETE SET NULL,
        mobile_location VARCHAR(255)  NULL,
        meeting_link    VARCHAR(500)  NULL,

        session_date    DATE          NOT NULL,
        start_time      TIME          NOT NULL,
        end_time        TIME          NOT NULL,

        -- => Renamed from instructor_id as part of the Instructor -> Trainer rename
        trainer_id      INTEGER       NULL REFERENCES trainers(trainer_id) ON DELETE SET NULL,

        created_by      INTEGER       NOT NULL REFERENCES admins(admin_id) ON DELETE SET NULL,
        remarks         TEXT          NULL,
        created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      -- => Sequence backing auto-generated OR numbers, must exist
      -- => before the payments table default references it.
      CREATE SEQUENCE IF NOT EXISTS payments_or_seq START WITH 1
    `;

    // => payments: OTC payment records for TESDA Regular, non-scholar
    // => enrollments only. SHS enrollments (DepEd-covered) and TESDA-scholar
    // => enrollments (TESDA-covered) never get a row here - that eligibility
    // => check lives in the service layer, not a DB constraint.
    await sql`
      CREATE TABLE IF NOT EXISTS payments (
        payment_id      SERIAL        PRIMARY KEY,
        public_id       UUID          NOT NULL DEFAULT gen_random_uuid() UNIQUE,

        -- => enrollment_type: 'TESDA' | 'SHS' - which enrollment table
        --    enrollment_id points at. No DB-level FK possible across two
        --    tables, enforced at the service layer instead, same pattern
        --    as class_sessions.batch_type / activity_logs.entity_type.
        enrollment_type VARCHAR(10)   NOT NULL DEFAULT 'TESDA',
        enrollment_id   INTEGER       NOT NULL,

        -- => Auto-generated, sequential, unique. Format: OR-000001
        or_number       VARCHAR(20)   NOT NULL UNIQUE DEFAULT ('OR-' || LPAD(nextval('payments_or_seq')::text, 6, '0')),

        amount          NUMERIC(10,2) NOT NULL CHECK (amount > 0),
        payment_date    DATE          NOT NULL DEFAULT CURRENT_DATE,
        payment_method  VARCHAR(20)   NOT NULL DEFAULT 'OTC',

        status          VARCHAR(15)   NOT NULL DEFAULT 'Completed'
                        CHECK (status IN ('Completed', 'Voided')),
        void_reason     TEXT          NULL,
        voided_by       INTEGER       NULL REFERENCES admins(admin_id) ON DELETE SET NULL,
        voided_at       TIMESTAMPTZ   NULL,

        remarks         TEXT          NULL,

        created_by      INTEGER       NOT NULL REFERENCES admins(admin_id) ON DELETE SET NULL,
        created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'payments_set_updated_at'
        ) THEN
          CREATE TRIGGER payments_set_updated_at
          BEFORE UPDATE ON payments
          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        END IF;
      END $$
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_payments_enrollment ON payments (enrollment_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments (created_at DESC)
    `;

    await sql`
      CREATE SEQUENCE IF NOT EXISTS refunds_refund_number_seq START WITH 1
    `;

    // => refunds: OTC only for now. Void mechanism mirrors payments exactly.
    await sql`
      CREATE TABLE IF NOT EXISTS refunds (
        refund_id         SERIAL        PRIMARY KEY,
        public_id         UUID          NOT NULL DEFAULT gen_random_uuid() UNIQUE,

        -- => enrollment_type: 'TESDA' | 'SHS' - which enrollment table
        --    enrollment_id points at. No DB-level FK possible across two
        --    tables, enforced at the service layer instead, same pattern
        --    as class_sessions.batch_type / activity_logs.entity_type.
        enrollment_type   VARCHAR(10)   NOT NULL DEFAULT 'TESDA',
        enrollment_id     INTEGER       NOT NULL,

        refund_number     VARCHAR(20)   NOT NULL UNIQUE DEFAULT ('RF-' || LPAD(nextval('refunds_refund_number_seq')::text, 6, '0')),

        refund_type       VARCHAR(15)   NOT NULL CHECK (refund_type IN ('Percentage', 'Fixed')),
        percentage_value  NUMERIC(5,2)  NULL CHECK (percentage_value > 0 AND percentage_value <= 100),
        amount            NUMERIC(10,2) NOT NULL CHECK (amount > 0),

        refund_method     VARCHAR(20)   NOT NULL DEFAULT 'OTC',
        reason            TEXT          NOT NULL,
        remarks           TEXT          NULL,

        status            VARCHAR(15)   NOT NULL DEFAULT 'Completed' CHECK (status IN ('Completed', 'Voided')),
        void_reason       TEXT          NULL,
        voided_by         INTEGER       NULL REFERENCES admins(admin_id) ON DELETE SET NULL,
        voided_at         TIMESTAMPTZ   NULL,

        created_by        INTEGER       NOT NULL REFERENCES admins(admin_id) ON DELETE SET NULL,
        created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'refunds_set_updated_at') THEN
          CREATE TRIGGER refunds_set_updated_at
          BEFORE UPDATE ON refunds
          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        END IF;
      END $$
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_refunds_enrollment ON refunds (enrollment_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds (status)`;

    // => Announcements shown on the Student Dashboard - already live in
    //    Neon, mirrored here for parity with the rest of this file's
    //    schema. Hard-delete only, no soft-delete/restore columns.
    await sql`
        CREATE TABLE IF NOT EXISTS announcements (
            announcement_id SERIAL        PRIMARY KEY,
            public_id       UUID          NOT NULL DEFAULT gen_random_uuid(),
            title           VARCHAR(200)  NOT NULL,
            message         TEXT          NOT NULL,
            is_active       BOOLEAN       NOT NULL DEFAULT true,
            created_by      INTEGER       NOT NULL REFERENCES admins(admin_id),
            created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
        )
    `;

    // => Single-row-per-slug static page content (Privacy Policy today,
    //    Terms of Service etc. later) - a slug's row only gets created
    //    on its first-ever Save, via the upsert in cmsPageModel.js, not
    //    pre-seeded here.
    await sql`
        CREATE TABLE IF NOT EXISTS cms_pages (
            page_id     SERIAL        PRIMARY KEY,
            slug        VARCHAR(50)   NOT NULL UNIQUE,
            content     TEXT          NOT NULL DEFAULT '',
            updated_by  INTEGER       NOT NULL REFERENCES admins(admin_id),
            updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
        )
    `;

    // => FAQ sections (Accounts, Enrollment, Payments, etc.) - dynamic,
    //    admin-created. Add-only from the UI; deletion is blocked by
    //    the FK below while any FAQ still references a section.
    await sql`
        CREATE TABLE IF NOT EXISTS faqs_sections (
            section_id  SERIAL        PRIMARY KEY,
            public_id   UUID          NOT NULL DEFAULT gen_random_uuid(),
            name        VARCHAR(100)  NOT NULL,
            sort_order  INTEGER       NOT NULL DEFAULT 0,
            created_by  INTEGER       NOT NULL REFERENCES admins(admin_id),
            created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
        )
    `;

    // => Individual FAQ entries, one section per FAQ. section_id here
    //    is the FK described above - resolving a section's public_id
    //    to this internal id happens in faqService.js, never in raw SQL.
    await sql`
        CREATE TABLE IF NOT EXISTS faqs (
            faq_id      SERIAL        PRIMARY KEY,
            public_id   UUID          NOT NULL DEFAULT gen_random_uuid(),
            section_id  INTEGER       NOT NULL REFERENCES faqs_sections(section_id),
            question    VARCHAR(300)  NOT NULL,
            answer      TEXT          NOT NULL,
            sort_order  INTEGER       NOT NULL DEFAULT 0,
            created_by  INTEGER       NOT NULL REFERENCES admins(admin_id),
            created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
            updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
        )
        `;


    await sql`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'announcements_set_updated_at') THEN
          CREATE TRIGGER announcements_set_updated_at
          BEFORE UPDATE ON announcements
          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        END IF;
      END $$
    `;

    // => Only need to filter fast on is_active for the badge count and the list view
    await sql`CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements (is_active)`;

    // => Student-submitted support tickets, badge count = this student's Open/In Progress rows
    await sql`
      CREATE TABLE IF NOT EXISTS support_tickets (
        ticket_id        SERIAL        PRIMARY KEY,
        public_id        UUID          NOT NULL DEFAULT gen_random_uuid() UNIQUE,

        student_id       BIGINT        NOT NULL REFERENCES student_accounts(student_id) ON DELETE CASCADE,

        subject          VARCHAR(200)  NOT NULL,
        message          TEXT          NOT NULL,
        status           VARCHAR(15)   NOT NULL DEFAULT 'Open'
                            CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Unresolved')), 

        resolved_by      INTEGER       NULL REFERENCES admins(admin_id) ON DELETE SET NULL,
        resolved_at      TIMESTAMPTZ   NULL,

        internal_remarks TEXT          NULL, 

        created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'support_tickets_set_updated_at') THEN
          CREATE TRIGGER support_tickets_set_updated_at
          BEFORE UPDATE ON support_tickets
          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        END IF;
      END $$
    `;

    // => Badge count query filters by student_id + status together, so index both
    await sql`CREATE INDEX IF NOT EXISTS idx_support_tickets_student ON support_tickets (student_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets (status)`;

    // => Public (anonymous) support tickets - no student_id, separate from
    // => the private support_tickets table for security separation
    await sql`
      CREATE TABLE IF NOT EXISTS public_support_tickets (
        ticket_id        SERIAL        PRIMARY KEY,
        public_id        UUID          NOT NULL DEFAULT gen_random_uuid() UNIQUE,

        full_name        VARCHAR(150)  NOT NULL,
        email            VARCHAR(255)  NOT NULL,

        concern_type     VARCHAR(50)   NOT NULL CHECK (concern_type IN (
                            'Course Clarification',
                            'Enrollment Status Tracking',
                            'Technical Issue',
                            'Feedback',
                            'Others'
                          )),
        concern          TEXT          NOT NULL,

        status           VARCHAR(15)   NOT NULL DEFAULT 'Open'
                            CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),

        created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'public_support_tickets_set_updated_at') THEN
          CREATE TRIGGER public_support_tickets_set_updated_at
          BEFORE UPDATE ON public_support_tickets
          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        END IF;
      END $$
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_public_support_tickets_status ON public_support_tickets (status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_public_support_tickets_created_at ON public_support_tickets (created_at DESC)`;

    await sql`
      CREATE TABLE IF NOT EXISTS announcements (
        announcement_id SERIAL PRIMARY KEY,
        public_id       UUID NOT NULL DEFAULT gen_random_uuid(),
        title           VARCHAR(200) NOT NULL,
        message         TEXT NOT NULL,
        is_active       BOOLEAN NOT NULL DEFAULT true,
        created_by      INTEGER NOT NULL REFERENCES admins(admin_id),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    // => Single-use, expiring tokens for both new-account password setup
    //    (purpose 'setup', created right after enrollment) and forgot-
    //    password resets (purpose 'reset'). token_hash stores a SHA-256
    //    hash of the raw token, never the raw value itself.
    await sql`
      CREATE TABLE IF NOT EXISTS password_setup_tokens (
        token_id     SERIAL        PRIMARY KEY,
        student_id   BIGINT        NOT NULL REFERENCES student_accounts(student_id),
        token_hash   TEXT          NOT NULL,
        purpose      VARCHAR(20)   NOT NULL DEFAULT 'setup',
        expires_at   TIMESTAMPTZ   NOT NULL,
        used_at      TIMESTAMPTZ,
        created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_password_setup_tokens_hash ON password_setup_tokens (token_hash)`;

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