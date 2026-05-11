// import express from "express";
// import helmet from "helmet";
// import morgan from "morgan";
// import dotenv from "dotenv";
// import cors from "cors";
// import cookieParser from "cookie-parser";

// // => Routes 
// // import locationRoutes from './routes/location.js';
//import locationRoutes, { loadLocationCache } from './routes/location.js';
// import referenceRoutes from './routes/reference.js';

// dotenv.config(); // => loads .env file into process.env

// const app = express();
// const PORT = process.env.PORT || 5000;

// // =>Middleware
// app.use(cors());
// app.use(helmet());
// app.use(morgan("dev"));
// app.use(express.json());
// app.use(cookieParser());

// // => Routes
// app.use('/api/location', locationRoutes); //=> /api/location/regions, /api/location/provinces/:regionCode, /api/location/cities/:provinceCode
// app.use('/api/reference', referenceRoutes); // => /api/reference/nationalities
// // I'll be changing this to only run once connected successfully to the database, but for now this is fine since we don't have a database yet.

// // => Pre-load location data from psgc.cloud into memory on startup
// await loadLocationCache();

// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import locationRoutes, { loadLocationCache } from './routes/location.js';
import referenceRoutes from './routes/reference.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// => Middleware
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

// => Routes
app.use('/api/location', locationRoutes);
app.use('/api/reference', referenceRoutes);

// => Wrap in async IIFE so loadLocationCache fully completes before server starts
(async () => {
  // => Pre-load location data from psgc.cloud into memory before accepting requests
  await loadLocationCache();

  // I'll be changing this to only run once connected successfully to the database,
  // but for now this is fine since we don't have a database yet.
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})();