# IKF PhoneBook - Contact Management System

A centralized contact management system that allows users to import contacts from multiple sources, categorize contacts, handle duplicates, and store them in a secure, structured database.

## Features

### Phase 1 Features
- **Multi-source Contact Import**: Gmail, Zoho CRM, Invoice System, CSV files
- **Raw Data Parsing**: Paste raw contact data and automatically parse into structured format
- **Duplicate Detection**: Smart duplicate checking and conflict resolution
- **Contact Categorization**: Organize contacts by relationship type (Client, Vendor, Lead, etc.)
- **Data Ownership**: Assign contacts to specific users (Pushkar, Sunil, etc.)
- **Secure Database**: Cloud-hosted PostgreSQL with encryption
- **Modern UI**: Beautiful, responsive interface built with React

### Contact Import Sources
1. **Gmail Integration**: OAuth 2.0 authentication with Gmail API
2. **Zoho CRM**: REST API integration for contact synchronization
3. **Invoice System**: API/DB access for transaction-related contacts
4. **CSV Import**: Drag-and-drop interface with field mapping
5. **Raw Data Parsing**: Intelligent parsing of pasted contact information

### Data Fields
- **Name** (First Name, Last Name)
- **Phone Number** (international format)
- **Email Address**
- **Relationship Type** (Client, Vendor, Lead, Partner, Other)
- **Data Owner** (assigned users)
- **Source** (Gmail, Zoho, Invoice System, CSV, Raw Data)
- **Contact Status** (Active/Inactive)

## Technology Stack

### Backend
- **Node.js** with Express.js
- **PostgreSQL** database
- **JWT** authentication
- **Multer** for file uploads
- **Google APIs** for Gmail integration
- **Axios** for external API calls

### Frontend
- **React** with TypeScript
- **Material-UI** for modern UI components
- **React Router** for navigation
- **Axios** for API communication

## Installation

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database
- npm or yarn

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ikf-phonebook
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   # Database
   DATABASE_URL=postgresql://username:password@localhost:5432/ikf_phonebook
   
   # JWT Secret
   JWT_SECRET=your-secret-key
   
   # Google OAuth
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   
   # Zoho API
   ZOHO_CLIENT_ID=your-zoho-client-id
   ZOHO_CLIENT_SECRET=your-zoho-client-secret
   
   # Server
   PORT=5000
   NODE_ENV=development
   ```

4. **Database Setup**
   ```bash
   npm run db:setup
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Contacts
- `GET /api/contacts` - Get all contacts
- `POST /api/contacts` - Create new contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact
- `POST /api/contacts/import/csv` - Import CSV contacts
- `POST /api/contacts/import/raw` - Import raw data
- `POST /api/contacts/import/gmail` - Import Gmail contacts
- `POST /api/contacts/import/zoho` - Import Zoho contacts

### Import Sources
- `GET /api/import/sources` - Get available import sources
- `POST /api/import/validate` - Validate import data

## Project Structure

```
ikf-phonebook/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── utils/         # Utility functions
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

## Security Features

- **JWT Authentication**: Secure user sessions
- **Data Encryption**: Sensitive data encrypted at rest
- **Rate Limiting**: API rate limiting for security
- **Input Validation**: Comprehensive input sanitization
- **CORS Protection**: Cross-origin resource sharing protection
- **Helmet Security**: Security headers middleware

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support and questions, please contact the IKF development team. 