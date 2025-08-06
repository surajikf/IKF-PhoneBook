# IKF PhoneBook Setup Guide

## Prerequisites

Before setting up IKF PhoneBook, ensure you have the following installed:

- **Node.js** (v16 or higher)
- **PostgreSQL** (v12 or higher)
- **npm** or **yarn**

## Quick Start

### 1. Clone and Install Dependencies

```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd ikf-phonebook

# Install all dependencies
npm run install-all
```

### 2. Database Setup

#### Option A: Local PostgreSQL

1. **Install PostgreSQL** (if not already installed)
   - **Windows**: Download from https://www.postgresql.org/download/windows/
   - **macOS**: `brew install postgresql`
   - **Linux**: `sudo apt-get install postgresql postgresql-contrib`

2. **Create Database**
   ```bash
   # Connect to PostgreSQL
   psql -U postgres
   
   # Create database
   CREATE DATABASE ikf_phonebook;
   
   # Create user (optional)
   CREATE USER ikf_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE ikf_phonebook TO ikf_user;
   ```

#### Option B: Cloud Database (Recommended for Production)

- **Supabase**: Free PostgreSQL hosting
- **Railway**: Easy PostgreSQL deployment
- **Heroku Postgres**: Reliable cloud database

### 3. Environment Configuration

1. **Copy the example environment file**
   ```bash
   cp env.example .env
   ```

2. **Edit `.env` file with your configuration**
   ```env
   # Database Configuration
   DATABASE_URL=postgresql://username:password@localhost:5432/ikf_phonebook
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   
   # Google OAuth Configuration (for Gmail integration)
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
   
   # Zoho CRM Configuration (for Zoho integration)
   ZOHO_CLIENT_ID=your-zoho-client-id
   ZOHO_CLIENT_SECRET=your-zoho-client-secret
   ZOHO_REDIRECT_URI=http://localhost:3000/auth/zoho/callback
   
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   ```

### 4. Initialize Database

```bash
# Setup database tables and indexes
npm run db:setup
```

### 5. Start Development Server

```bash
# Start both frontend and backend
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## Configuration Details

### Database Configuration

The system uses PostgreSQL with the following tables:
- `users` - User accounts and authentication
- `contacts` - Contact information
- `import_sessions` - Import tracking

### Authentication Setup

#### Google OAuth (for Gmail integration)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API and People API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback` (development)
   - `https://your-domain.com/auth/google/callback` (production)

#### Zoho CRM Integration

1. Go to [Zoho Developer Console](https://api-console.zoho.com/)
2. Create a new client
3. Add redirect URIs:
   - `http://localhost:3000/auth/zoho/callback` (development)
   - `https://your-domain.com/auth/zoho/callback` (production)

## Features Overview

### Phase 1 Features Implemented

✅ **Multi-source Contact Import**
- Gmail integration with OAuth 2.0
- Zoho CRM integration
- CSV file import with field mapping
- Raw data parsing and import

✅ **Raw Data Parsing**
- Intelligent parsing of pasted contact data
- Support for multiple formats (CSV, tab-separated, custom)
- Automatic phone number formatting
- Email validation

✅ **Duplicate Detection**
- Smart duplicate checking based on phone, email, and name
- Similarity scoring algorithm
- Merge functionality for duplicate contacts

✅ **Contact Management**
- CRUD operations for contacts
- Search and filtering
- Contact categorization (Client, Vendor, Lead, etc.)
- Data ownership assignment

✅ **Security Features**
- JWT authentication
- Password hashing with bcrypt
- Input validation and sanitization
- Rate limiting
- CORS protection

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user profile

### Contacts
- `GET /api/contacts` - Get all contacts (with filtering)
- `POST /api/contacts` - Create new contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact
- `GET /api/contacts/stats/overview` - Get contact statistics

### Import
- `POST /api/contacts/import/raw` - Import raw data
- `POST /api/import/csv` - Import CSV file
- `POST /api/import/gmail` - Import Gmail contacts
- `POST /api/import/zoho` - Import Zoho contacts
- `GET /api/import/sources` - Get available import sources

## Development

### Project Structure

```
ikf-phonebook/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── contexts/      # React contexts
│   │   └── types/         # TypeScript types
├── server/                 # Node.js backend
│   ├── controllers/        # Route controllers
│   ├── middleware/         # Express middleware
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   └── utils/             # Utility functions
├── database/              # Database migrations and seeds
└── docs/                  # Documentation
```

### Available Scripts

```bash
# Development
npm run dev              # Start both frontend and backend
npm run server           # Start backend only
npm run client           # Start frontend only

# Database
npm run db:setup         # Initialize database tables
npm run db:seed          # Seed database with sample data

# Production
npm run build            # Build frontend for production
npm start                # Start production server

# Installation
npm run install-all      # Install all dependencies
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify PostgreSQL is running
   - Check DATABASE_URL in .env file
   - Ensure database exists and user has permissions

2. **Port Already in Use**
   - Change PORT in .env file
   - Kill existing processes on ports 3000/5000

3. **Module Not Found Errors**
   - Run `npm run install-all` to install all dependencies
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`

4. **CORS Errors**
   - Check that frontend is running on http://localhost:3000
   - Verify CORS configuration in server/index.js

### Getting Help

- Check the console for error messages
- Verify all environment variables are set correctly
- Ensure all dependencies are installed
- Check database connection and permissions

## Next Steps

### Phase 2 Features (Future)

- WhatsApp messaging integration
- Contact analytics and reporting
- AI-driven insights and recommendations
- Advanced search and filtering
- Contact groups and tags
- Export functionality
- Mobile app development

### Production Deployment

1. **Environment Setup**
   - Set NODE_ENV=production
   - Use strong JWT_SECRET
   - Configure production database
   - Set up SSL certificates

2. **Security Considerations**
   - Enable HTTPS
   - Configure proper CORS settings
   - Set up rate limiting
   - Implement proper logging
   - Regular security updates

3. **Performance Optimization**
   - Database indexing
   - Caching strategies
   - CDN for static assets
   - Load balancing

## Support

For technical support or questions:
- Check the documentation
- Review the code comments
- Create an issue in the repository
- Contact the development team

---

**IKF PhoneBook** - Centralized Contact Management System
Version 1.0.0 