const jwt = require('jsonwebtoken');

// Express middleware that protects admin-only routes (PUT/DELETE).
// Expects an "Authorization: Bearer <token>" header.
function requireAdmin(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'Server auth is not configured.' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'admin') {
      return res.status(403).json({ error: 'Admin privileges required.' });
    }

    req.admin = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = { requireAdmin };
