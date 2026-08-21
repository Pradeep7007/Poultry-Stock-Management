const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const eggRoutes = require('./routes/eggRoutes');
const batchRoutes = require('./routes/batchRoutes');
const feedRoutes = require('./routes/feedRoutes');
const henRoutes = require('./routes/henRoutes');
const medicineRoutes = require('./routes/medicineRoutes');
const workerRoutes = require('./routes/workerRoutes');

connectDB();
const app = express();

const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  credentials: false
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[API] total: ${duration} ms | ${req.method} ${req.originalUrl}`);
  });
  next();
});

app.use(express.json());

app.use('/api/eggs', eggRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/hens', henRoutes);
app.use('/api/vaccines', medicineRoutes);
app.use('/api/workers', workerRoutes);

// Error Handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server running on http://127.0.0.1:${PORT}`);
  });
}

app.get("/", (req, res) => {
  res.send("Backend is running!");
});

module.exports = app;
