const jwt = require('jsonwebtoken');

module.exports = function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }
  // Support both "Bearer <token>" and raw "<token>"
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'crickyworld_dev_secret');
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Token is not valid or has expired' });
  }
};