const { timingSafeEqual } = require('node:crypto');

function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected) {
    return res.status(503).json({ error: { code: 'ADMIN_NOT_CONFIGURED', message: 'Admin access is not configured' } });
  }
  const authorization = req.get('authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Admin authentication required' } });
  const supplied = Buffer.from(match[1]);
  const expectedBytes = Buffer.from(expected);
  if (supplied.length !== expectedBytes.length || !timingSafeEqual(supplied, expectedBytes)) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Admin authentication required' } });
  }
  return next();
}

module.exports = { requireAdmin };
