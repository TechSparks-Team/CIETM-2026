const express = require('express'); // Triggering reload
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Cache NODE_ENV before dotenv loads so we can force production testing locally
const envNodeEnv = process.env.NODE_ENV;

// Load environment variables (do not override if already set in process.env)
dotenv.config({ override: false });

// Restore NODE_ENV if it was explicitly passed to the process
if (envNodeEnv) {
    process.env.NODE_ENV = envNodeEnv;
}

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(helmet({
    contentSecurityPolicy: false,
}));
app.use(compression({
    filter: (req, res) => {
        // Broadly disable compression for all API routes, especially downloads,
        // to prevent double-compression or corruption of binary streams/buffers
        if (req.path.startsWith('/api')) {
            return false;
        }
        return compression.filter(req, res);
    }
}));

// Request logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Increased for conference apps as users might refresh many times
    message: { message: 'Too many requests from this IP, please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
    'https://cietm.online',
    'http://localhost:5174',
    'http://10.237.41.18:5173'
].filter(Boolean);

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            return callback(new Error('CORS Policy: Origin not allowed'), false);
        }
        return callback(null, true);
    },
    credentials: true,
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import Routes
const authRoutes = require('./routes/authRoutes');
const registrationRoutes = require('./routes/registrationRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingsRoutes);

// Serve frontend if it's built (Production / Static Hosting)
const fs = require('fs');
const path = require('path');
const clientDistPath = path.join(__dirname, '../client/dist');

if (fs.existsSync(clientDistPath)) {
    console.log(`Serving static files from: ${clientDistPath}`);
    app.use(express.static(clientDistPath));
} else {
    console.log(`Development mode API running without static frontend.`);
    app.get('/', (req, res) => {
        res.send('API is running... (Development Mode)');
    });
}

// SPA Fallback & 404 Handler
app.use((req, res, next) => {
    // SPA Fallback: Send index.html for GET requests that are NOT API calls and NOT download links
    const isApiRequest = req.path.startsWith('/api') || req.path.includes('/download');
    
    if (fs.existsSync(clientDistPath) && req.method === 'GET' && !isApiRequest) {
        return res.sendFile(path.resolve(clientDistPath, 'index.html'));
    }
    next();
});

// Explicit 404 handler for API/Download routes that fall through
app.use((req, res) => {
    res.status(404).json({ message: `Route ${req.method} ${req.path} not found on this server.` });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
