let app;
let initError = null;

try {
  // First try client/server/index, then fallback to ../server/index or ../../server/index
  try {
    app = require('../server/index');
  } catch (e1) {
    try {
      app = require('../../server/index');
    } catch (e2) {
      initError = e1;
      console.error('[Vercel Serverless Init Error in client/api/index.js]:', e1, e2);
    }
  }
} catch (err) {
  initError = err;
}

module.exports = (req, res) => {
  if (initError) {
    return res.status(500).json({
      error: 'Serverless Function Init Error',
      message: initError.message || 'An initialization error occurred on the server.',
      detail: process.env.NODE_ENV === 'development' ? initError.stack : undefined,
    });
  }

  if (!app) {
    try {
      app = require('../server/index');
    } catch (err) {
      return res.status(500).json({
        error: 'Serverless Function Load Error',
        message: err.message || 'Unable to load application handler.',
      });
    }
  }

  return app(req, res);
};
