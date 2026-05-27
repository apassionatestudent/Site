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

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // => 5MB limit per file, matching frontend validation
}).fields([
  { name: 'birthCert', maxCount: 1 },
  { name: 'schoolDoc', maxCount: 1 },
  { name: 'validId',   maxCount: 1 },
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