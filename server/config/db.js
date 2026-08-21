const mongoose = require('mongoose');

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is missing. Please configure it in Vercel Project Settings.");
  }

  if (!cached.promise) {
    const startTime = Date.now();
    cached.promise = mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }).then((mongooseInstance) => {
      const duration = Date.now() - startTime;
      console.log(`[DB] connection: ${duration} ms | Host: ${mongooseInstance.connection.host}`);
      return mongooseInstance;
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
