const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    // 1. Check Authorization Header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    // 2. Check req.query.token (case-insensitive fallback)
    if (!token && req.query) {
        token = req.query.token || req.query.Token;
    }

    // 3. Fallback: Parse from URL directly
    if (!token) {
        const fullUrl = req.originalUrl || req.url;
        const match = fullUrl.match(/[?&]token=([^&#]+)/i); // Case insensitive match
        if (match) {
            token = match[1];
        }
    }

    if (token) {
        console.log(`[Auth] Token found: ${token.slice(0, 10)}... for path ${req.path}`);
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
            return next();
        } catch (error) {
            return res.status(401).json({
                message: 'Not authorized, token failed'
            });
        }
    }

    return res.status(401).json({
        message: 'Not authorized, no token'
    });
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as an admin' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `User role ${req.user.role} is not authorized to access this route`
            });
        }
        next();
    };
};

module.exports = { protect, admin, authorize };
