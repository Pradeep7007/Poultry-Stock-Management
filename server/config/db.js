const mongoose = require('mongoose');

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is missing. Please configure it in Vercel Project Settings.");
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };
    
    const startTime = Date.now();
    cached.promise = mongoose.connect(process.env.MONGODB_URI, opts).then((mongoose) => {
      const duration = Date.now() - startTime;
      console.log(`[DB] connection: ${duration} ms`);
      console.log(`MongoDB Connected: ${mongoose.connection.host}`);
      return mongoose;
    });
  }
  
  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error(`[DB Error]: ${error.message}`);
    throw error;
  }
  
  return cached.conn;
};

module.exports = connectDB;
