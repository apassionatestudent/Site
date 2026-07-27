// => public/controllers/Enrollments/documentProxyController.js
// => Relocated from controllers/documentProxyController.js into the
//    Enrollments folder - logic is unchanged, only the import path to
//    middleware/upload.js was adjusted for the new folder depth

import { GetObjectCommand } from '@aws-sdk/client-s3';
import { r2Client } from '../../middleware/upload.js';
import dotenv from 'dotenv';
dotenv.config();

const { R2_BUCKET_NAME } = process.env;

export const proxyDocument = async (req, res) => {
  // => documentKey is the R2 object key stored in the DB
  // => e.g. "primeenroll/student-docs/birthCert_1234567890.jpg"
  // => The client encodes slashes as %2F so we decode it back
  const documentKey = decodeURIComponent(req.params.documentKey);

  if (!documentKey) {
    return res.status(400).json({ error: 'Bad request: missing document key.' });
  }

  try {
    // => Fetch the object directly from R2 - server to server
    // => The raw R2 URL never leaves the server
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key:    documentKey,
    });

    const r2Response = await r2Client.send(command);

    // => Forward the correct Content-Type so the browser renders it properly
    // => e.g. image/jpeg, image/png, application/pdf
    if (r2Response.ContentType) {
      res.setHeader('Content-Type', r2Response.ContentType);
    }

    // => Tell the browser not to cache this response
    // => Every request must go through the auth check in protectStudent
    res.setHeader('Cache-Control', 'no-store');

    // => Stream the file body directly to the client response
    // => Avoids loading the entire file into memory at once
    r2Response.Body.pipe(res);

  } catch (err) {
    // => NoSuchKey is R2's error when the object doesn't exist
    if (err.name === 'NoSuchKey') {
      return res.status(404).json({ error: 'Document not found.' });
    }
    console.error('Document proxy error:', err);
    res.status(500).json({ error: 'Internal server error while fetching document.' });
  }
};
