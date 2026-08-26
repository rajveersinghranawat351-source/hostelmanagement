let app;
try {
  app = require('../../server/index');
} catch (err) {
  try {
    app = require('../server/index');
  } catch (e) {
    console.error('Client API Serverless init error:', err, e);
  }
}

module.exports = (req, res) => {
  if (!app) {
    try {
      app = require('../../server/index');
    } catch (err) {
      return res.status(500).json({
        error: 'Serverless Function Init Error',
        message: err.message || 'Unable to load application server.',
      });
    }
  }
  return app(req, res);
};
