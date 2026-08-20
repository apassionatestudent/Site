import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
dotenv.config();

// => Destructure R2 credentials matching the same pattern as db.js
const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
} = process.env;

// => R2 uses the S3-compatible API - endpoint follows Cloudflare's format
// => No changes needed to the S3Client API itself; only the endpoint differs from AWS
export const r2Client = new S3Client({
  region: 'auto', // => R2 doesn't use AWS regions; 'auto' is the correct value
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// => memoryStorage keeps files as buffers in RAM instead of writing to disk
// => Required so we can pass the buffer directly to R2
const storage = multer.memoryStorage();

// => Only accept JPG, PNG, and PDF
// => PDFs added since enrollment docs (certs, IDs) are commonly submitted as PDF
const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, and PDF files are allowed.'), false);
  }
};

// => Switched from .fields([...]) (a fixed whitelist of field names) to
// => .any() since TESDA upload field names are now dynamic per course
// => requirement (e.g. "req_12"), generated from tesda_course_requirements,
// => not a fixed birthCert/schoolDoc/validId set. req.files becomes a flat
// => array instead of a keyed object - the service layer groups them back
// => by fieldname using a manifest sent alongside the files.
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // => 5MB limit per file, matching frontend validation
    files: 30,                 // => Defensive ceiling across all requirements combined
  },
}).any();

// => Stricter fileFilter for SHS uploads - JPG/PNG only, no PDF
// => (SHSStep2 restricts to JPG/PNG with real MIME-type validation on
// => the frontend; this mirrors that restriction server-side)
const shsFileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG and PNG files are allowed.'), false);
  }
};

// => Separate multer instance from `upload` since SHS has different field
// => names AND a different fileFilter (no PDF) - fields correspond exactly
// => to shsDocuments' keys in Enroll.jsx
export const uploadShs = multer({
  storage,
  fileFilter: shsFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // => same 5MB limit as TESDA
}).fields([
  { name: 'psaBirthCertificate',  maxCount: 1 },
  // => raised from 1 to 2 - SHSStep2.jsx allows up to 2 files for this
  // => field (e.g. front and back of the report card)
  { name: 'grade10ReportCard',    maxCount: 2 },
  { name: 'goodMoralCertificate', maxCount: 1 },
  { name: 'escCertificate',       maxCount: 1 },
]);

// => Uploads a buffer to R2 and returns the object key
// => The key is what gets stored in the DB - never a public URL
// => The proxy route uses the key to fetch the file server-side on demand
export const uploadToR2 = async (buffer, key, mimetype) => {
  const command = new PutObjectCommand({
    Bucket:      R2_BUCKET_NAME,
    Key:         key,              // => e.g. "primeenroll/student-docs/birthCert_1234567890"
    Body:        buffer,
    ContentType: mimetype,         // => Stored so R2 serves the correct Content-Type on retrieval
  });

  await r2Client.send(command);

  // => Return only the key - the actual R2 URL is never exposed outside the server
  return key;
};