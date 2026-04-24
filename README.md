# CIETM 2026 - Conference Management System

> **A comprehensive MERN stack application for managing conference registrations, paper submissions, peer reviews, and participant verification at scale.**

![Status](https://img.shields.io/badge/status-production-brightgreen)
![Node](https://img.shields.io/badge/node-v18%2B-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 📋 Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Roles & Workflows](#roles--workflows)
- [Security](#security)
- [Performance](#performance)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## 📌 Overview

CIETM 2026 is an enterprise-grade conference management platform designed to streamline the entire lifecycle of academic conferences:
- **User Registration**: Multi-role registration with email verification
- **Paper Submission**: Centralized manuscript management with version control
- **Peer Review System**: Automated reviewer assignment with track-based matching
- **Payment Processing**: Secure payment gateway integration with CashFree
- **Event Management**: Full administrative control with analytics and reporting
- **Certificate Generation**: Automated certificate issuance for participants

---

## ✨ Features

### Core Features
- ✅ **Multi-Role Authentication**: Admin, Chair, Reviewer, Author roles with RBAC
- ✅ **Paper Management**: Submit, track, review, and manage manuscripts
- ✅ **Reviewer Assignment**: Intelligent auto-assignment based on expertise
- ✅ **Email Notifications**: Real-time updates for submissions, reviews, and payments
- ✅ **Payment Integration**: CashFree gateway for secure transactions
- ✅ **Certificate Management**: Generate and verify participation certificates
- ✅ **Analytics Dashboard**: Real-time conference metrics and insights
- ✅ **Bulk Operations**: Efficient export and import of conference data

### Security & Performance
- 🔒 JWT-based authentication with secure token generation
- 🔒 Email verification for new accounts
- 🔒 Rate limiting and DDoS protection
- ⚡ Gzip compression for all responses
- ⚡ Lazy loading and code splitting in React
- ⚡ Optimized MongoDB queries with indexing

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: MongoDB (v6+) with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Email**: Brevo SMTP for transactional emails
- **File Storage**: Cloudinary CDN for images and PDFs
- **Payment**: CashFree Payment Gateway

### Frontend
- **Framework**: React 18+ with Vite
- **State Management**: React Context API
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **UI Components**: Lucide Icons, React Hot Toast
- **Routing**: React Router DOM

### DevOps & Deployment
- **Frontend Hosting**: Render (static SPA)
- **Backend Hosting**: Railway (Node.js server)
- **Database**: MongoDB Atlas (cloud)
- **Process Manager**: PM2 (optional for local production)

---

## 🚀 Quick Start

### Prerequisites
```bash
# Install Node.js v18+
node --version  # v18.0.0 or higher

# Install git
git --version
```

### Clone & Setup (5 minutes)
```bash
# Clone repository
git clone https://github.com/yourusername/CIETM-2026.git
cd CIETM-2026

# Install dependencies
cd server && npm install
cd ../client && npm install

# Create .env files (see Configuration section below)
# Copy .env.example to .env for both server and client

# Start development servers
# Terminal 1 - Backend
cd server && npm start

# Terminal 2 - Frontend
cd client && npm run dev
```

Access the app at `http://localhost:5174`

---

## 📦 Installation

### Backend Installation

1. **Navigate to server directory**
   ```bash
   cd server
   npm install --omit=optional  # Production: use --omit=dev
   ```

2. **Create `.env` file**
   ```bash
   cp .env.example .env
   ```

3. **Configure environment variables** (see Configuration section)

4. **Start the server**
   ```bash
   # Development
   npm run dev

   # Production
   npm start

   # With PM2 (recommended for production)
   pm2 start index.js --name "cietm-api"
   ```

### Frontend Installation

1. **Navigate to client directory**
   ```bash
   cd client
   npm install
   ```

2. **Create `.env` file**
   ```bash
   VITE_API_URL=http://your-api-url  # e.g., https://api.cietm.online
   ```

3. **Build for production**
   ```bash
   npm run build  # Creates dist/ folder
   ```

4. **Preview build locally**
   ```bash
   npm run preview
   ```

---

## ⚙️ Configuration

### Backend Environment Variables (`.env`)

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/?appName=CIETM

# Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Cloudinary (File Storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email Service (Brevo/Sendinblue)
EMAIL_SERVICE=brevo
BREVO_API_KEY=xkeysib-xxxxx
EMAIL_USER=your-email@smtp-brevo.com
EMAIL_FROM=CIET <noreply@cietm.online>

# Payment Gateway (CashFree)
CASHFREE_APP_ID=your_app_id
CASHFREE_SECRET_KEY=your_secret_key
CASHFREE_API_VERSION=2022-09-01
CASHFREE_ENV=TEST  # or PROD

# Admin Credentials (Initial Setup)
ADMIN_NAME=Admin User
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure_password_here

# URLs
FRONTEND_URL=https://cietm.online
CLIENT_URL=https://cietm.online
```

### Frontend Environment Variables (`.env`)

```env
# API Configuration
VITE_API_URL=https://cietm-2026-production.up.railway.app
```

**⚠️ Important**: 
- Ensure `VITE_API_URL` includes the `https://` protocol
- Do NOT include trailing slashes in the API URL
- Keep `.env` files in `.gitignore` to prevent credential leaks

---

## 📂 Project Structure

```
CIETM-2026/
├── server/
│   ├── config/              # Database and service configurations
│   ├── controllers/         # Business logic for each route
│   ├── middleware/          # Authentication, validation, error handling
│   ├── models/              # MongoDB schema definitions
│   ├── routes/              # API endpoint definitions
│   ├── utils/               # Helper functions (email, tokens)
│   ├── index.js             # Express app entry point
│   ├── seeder.js            # Database initialization script
│   └── package.json
│
├── client/
│   ├── src/
│   │   ├── components/      # Reusable React components
│   │   ├── pages/           # Page components for each route
│   │   ├── context/         # React Context (Auth, etc.)
│   │   ├── utils/           # Helper functions (downloads, etc.)
│   │   ├── constants/       # Conference data constants
│   │   ├── App.jsx          # Main app component
│   │   └── main.jsx         # Vite entry point
│   ├── public/              # Static assets
│   ├── dist/                # Production build (generated)
│   ├── vite.config.js       # Vite configuration
│   └── package.json
│
├── README.md                # This file
├── LICENSE                  # MIT License
└── .gitignore
```

---

## 🔌 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/verify-email` | Verify email with OTP |
| POST | `/api/auth/forgot-password` | Request password reset |
| PUT | `/api/auth/profile` | Update user profile |
| GET | `/api/auth/profile` | Get user profile |

### Paper Management Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/submissions` | Submit new paper |
| GET | `/api/submissions` | List user submissions |
| PUT | `/api/submissions/:id` | Update submission |
| GET | `/api/submissions/:id` | Get submission details |
| DELETE | `/api/submissions/:id` | Delete submission |

### Review Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reviews/assigned` | Get assigned reviews |
| POST | `/api/reviews` | Submit review |
| PUT | `/api/reviews/:id` | Update review |

### Payment Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/initiate` | Initiate payment |
| POST | `/api/payments/callback` | Payment callback |
| GET | `/api/payments/status/:id` | Check payment status |

---

## 👥 Roles & Workflows

### Author
- **Registration**: Create account and verify email
- **Submission**: Upload manuscripts with metadata (title, abstract, track)
- **Tracking**: Monitor review status and feedback
- **Payment**: Pay fees for registration or publication
- **Dashboard**: View submissions, messages, and certificate status

### Reviewer
- **Assignment**: Auto-assigned papers based on expertise
- **Review**: Provide technical feedback with acceptance/rejection recommendations
- **Dashboard**: Track review workload and submissions status
- **Availability**: Update expertise areas and load capacity

### Chair
- **Management**: Oversee reviewers and papers for assigned track
- **Assignment**: Override auto-assignment if needed
- **Decisions**: Make final paper acceptance/rejection decisions
- **Reporting**: View track-specific analytics

### Admin
- **Full Control**: User management, settings, database operations
- **Configuration**: Manage conference phases, deadlines, fees
- **Analytics**: View comprehensive system metrics and reports
- **Maintenance**: Enable/disable features, purge data, generate certificates

---

## 🔒 Security

### Authentication & Authorization
- **JWT Tokens**: Stateless authentication with signed tokens
- **Email Verification**: Mandatory verification for all new accounts
- **Password Security**: bcrypt hashing with salt rounds = 10
- **Role-Based Access**: RBAC middleware on all protected routes
- **Token Expiration**: Tokens expire in configurable intervals

### Network Security
- **HTTPS Only**: All production traffic encrypted
- **CORS Protection**: Configured for production domains
- **Helmet Middleware**: Secure HTTP headers (X-Frame-Options, etc.)
- **Rate Limiting**: 15-minute window, 100 requests per IP
- **Input Validation**: Sanitization on all API inputs

### Data Protection
- **Database Encryption**: MongoDB Atlas encryption at rest
- **File Security**: Private URLs through Cloudinary signed links
- **Credential Management**: Environment variables for all secrets
- **Audit Logging**: Track admin actions and sensitive operations

---

## ⚡ Performance

### Frontend Optimization
- ✅ **Code Splitting**: Route-based lazy loading with React.lazy()
- ✅ **Minification**: Esbuild minification in production
- ✅ **Asset Optimization**: Image optimization via Cloudinary
- ✅ **Caching**: Browser cache headers for static assets
- ✅ **Bundle Size**: Optimized with tree-shaking

### Backend Optimization
- ✅ **Compression**: Gzip compression for all responses
- ✅ **Database Indexing**: Indexed queries for faster lookups
- ✅ **Pagination**: Limit response size for large datasets
- ✅ **Caching**: In-memory caching for frequently accessed data
- ✅ **Connection Pooling**: MongoDB connection pooling

### Key Metrics
- **Initial Load Time**: < 2 seconds
- **API Response Time**: < 200ms (avg)
- **Build Size**: ~450KB (gzipped)
- **Database Query Time**: < 100ms (with indexing)

---

## 🚀 Deployment

### Deployment Architecture

```
┌─────────────────────────────────────┐
│     Render (Frontend)               │
│  https://cietm.online              │
│  - SPA: React + Vite (dist/)        │
│  - CDN: Global edge locations       │
└────────────┬────────────────────────┘
             │ HTTPS
             ↓
┌─────────────────────────────────────┐
│  Railway (Backend)                  │
│  cietm-2026-production.up.railway.app
│  - Node.js + Express                │
│  - PORT: 5000                       │
│  - Auto-deploys on git push         │
└────────────┬────────────────────────┘
             │
             ↓
┌─────────────────────────────────────┐
│  MongoDB Atlas (Database)           │
│  - Cluster replication for HA       │
│  - Automated backups                │
│  - Role-based access control        │
└─────────────────────────────────────┘
```

### Backend Deployment (Railway)

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Railway Configuration** (automatic from `package.json`)
   - Start command: `node index.js`
   - Environment variables: Set in Railway dashboard

3. **Health Check**
   ```bash
   curl https://cietm-2026-production.up.railway.app/api/health
   ```

### Frontend Deployment (Render)

1. **Updated `.env` for Production**
   ```env
   VITE_API_URL=https://cietm-2026-production.up.railway.app
   ```

2. **Push Changes**
   ```bash
   git push origin main
   ```

3. **Render Auto-Deploy**
   - Trigger: On push to main branch
   - Build: `npm run build`
   - Static files served from `dist/`

### Production Environment Variables

Store these in your hosting platform's dashboard:

**Railway (Backend)**:
- All `.env` variables from Configuration section
- Set `NODE_ENV=production`

**Render (Frontend)**:
- `VITE_API_URL=https://cietm-2026-production.up.railway.app`

---

## 🔧 Troubleshooting

### Login Issue: Stuck on Login Page

**Symptom**: After entering credentials, page doesn't redirect to dashboard.

**Solution**:
1. Check `VITE_API_URL` format: Must include `https://` protocol
2. Verify API URL has NO trailing slash
3. Clear browser cache and localStorage
4. Check browser console for CORS/network errors

```javascript
// Debug: Open browser console and check
console.log('API Base URL:', import.meta.env.VITE_API_URL);
```

### Database Connection Failed

**Symptom**: Server crashes with "MongoNetworkError"

**Solution**:
```bash
# Verify connection string format
# Should be: mongodb+srv://username:password@cluster.mongodb.net/?appName=CIETM

# Check MongoDB Atlas:
# 1. IP Whitelist: Add Railway IP or 0.0.0.0
# 2. Database User: Ensure password doesn't have special chars (or URL-encode)
# 3. Network Access: Allow access from anywhere
```

### Email Not Sending

**Symptom**: Verification emails not received

**Solution**:
1. Verify Brevo API key is correct
2. Check spam/promotional folder
3. Ensure `EMAIL_FROM` is a verified sender in Brevo
4. Check server logs: `npm run logs` on Railway

### CORS Errors in Browser Console

**Symptom**: "Access to XMLHttpRequest denied" errors

**Solution**:
1. Update `FRONTEND_URL` on backend to match your domain
2. Verify production domain is whitelisted
3. Check proxy configuration in `vite.config.js`

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m "Add your feature"`
4. Push to branch: `git push origin feature/your-feature`
5. Open a Pull Request

### Code Style
- Use consistent naming conventions
- Write meaningful commit messages
- Add comments for complex logic
- Test before submitting PRs

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](./LICENSE) file for details.

---

## 📞 Contact

- **Documentation**: See README sections above
- **Issues**: Open an issue on GitHub
- **Email**: support@cietm.online


