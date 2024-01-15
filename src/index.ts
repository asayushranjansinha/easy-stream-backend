import dotenv from 'dotenv';
import connectDB from "./db";

dotenv.config({ path: './.env' })

// Connecting to DB
connectDB();