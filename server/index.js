const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { db } = require('./db');
const authRoutes = require('./routes/authRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const studentRoutes = require('./routes/studentRoutes');
const ownerRoutes = require('./routes/ownerRoutes');
const documentRoutes = require('./routes/documentRoutes');
const { supabase } = require('./supabase');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
}));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Request logging in development
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/documents', documentRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Hostel PG Management API',
  });
});

app.get('/api/supabase-test', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(200).json({
        connected: false,
        message: 'Supabase client is not initialized. Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment variables.',
      });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (error) {
      return res.status(500).json({
        connected: false,
        error: error.message,
      });
    }

    return res.json({
      connected: true,
      message: 'Supabase database connected successfully!',
      data,
    });
  } catch (error) {
    return res.status(500).json({
      connected: false,
      error: error.message,
    });
  }
});

// Serve frontend in production if built
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

app.use((req, res) => {
  if (req.url.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  const indexPath = path.join(clientDistPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send('Hostel PG Server is running. Client is in development mode.');
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Hostel/PG Management Server running on port http://localhost:${PORT}`);
  });
}

module.exports = app;
