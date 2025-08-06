# IKF PhoneBook - Contact Management System

A centralized contact management system that allows users to import contacts from multiple sources, categorize contacts, handle duplicates, and store them in a secure, structured database.

## 🚀 Live Demo
**https://surajikf.github.io/ai-tools**

## ✅ Phase 1 Features Complete

- **Multi-source Contact Import**: Gmail, Zoho CRM, CSV files, Raw data
- **Raw Data Parsing**: Intelligent parsing of pasted contact data
- **Duplicate Detection**: Smart duplicate checking and conflict resolution
- **Contact Categorization**: Organize by relationship type (Client, Vendor, Lead, etc.)
- **Secure Database**: SQLite with encryption and indexing
- **Modern UI**: Beautiful, responsive interface built with React

## 🛠️ Technology Stack

**Backend:**
- Node.js with Express.js
- SQLite database
- JWT authentication
- Multer for file uploads
- Google APIs for Gmail integration

**Frontend:**
- React with TypeScript
- Material-UI for modern UI components
- React Router for navigation
- Axios for API communication

## 🎯 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/surajikf/ai-tools.git
   cd ai-tools
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Setup database**
   ```bash
   npm run db:setup
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## 📱 Features

### Raw Data Import
Paste contact data in any format and the system intelligently parses it:
```
John Doe, john@example.com, +1234567890
Jane Smith, jane@company.com, 987-654-3210
```

### Multi-Source Import
- **Gmail Integration**: OAuth 2.0 authentication
- **Zoho CRM**: REST API integration
- **CSV Import**: Drag-and-drop with field mapping
- **Raw Data**: Intelligent parsing of pasted text

### Contact Management
- Full CRUD operations
- Advanced search and filtering
- Contact categorization
- Data ownership assignment
- Duplicate detection and merge

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- Rate limiting and CORS protection
- Helmet security headers

## 📊 API Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/contacts` - Get all contacts
- `POST /api/contacts/import/raw` - Import raw data
- `GET /api/health` - Health check

## 🎨 UI/UX

- Modern Material-UI design
- Responsive layout for all devices
- Intuitive navigation
- Real-time feedback
- Beautiful animations

## 🚀 Deployment

The application is deployed on GitHub Pages at:
**https://surajikf.github.io/ai-tools**

## 📝 License

MIT License - see LICENSE file for details

## 👥 Support

For support and questions, please contact the IKF development team. 