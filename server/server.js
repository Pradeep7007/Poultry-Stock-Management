require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const eggRoutes = require('./routes/eggRoutes');
const batchRoutes = require('./routes/batchRoutes');
const feedRoutes = require('./routes/feedRoutes');
const henRoutes = require('./routes/henRoutes');
const medicineRoutes = require('./routes/medicineRoutes');

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/eggs', eggRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/hens', henRoutes);
app.use('/api/vaccines', medicineRoutes);

// Error Handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

app.get("/", (req, res) => {
  res.send("Backend is running!");
});

module.exports = app;

