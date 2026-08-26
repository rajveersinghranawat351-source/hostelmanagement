let app;
let initError = null;

try {
  app = require('../server/index');
} catch (err) {
  initError = err;
  console.error('[Vercel Serverless Init Error]:', err);
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
