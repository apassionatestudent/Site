// ../backend/config/db.js

import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

// allow dotenv to read .env file
dotenv.config();

// environment variables
const { PGHOST, PGDATABASE, PGUSER, PGPASSWORD } = process.env; 

// connect to the database 
export const sql = neon(
    `postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}/${PGDATABASE}?sslmode=require`,

    { 
        fullResults: true,  // Returns full { rows: [...] } instead of raw arrays 
        arrayMode: false    // Object mode (not array mode)
    }
    
)
