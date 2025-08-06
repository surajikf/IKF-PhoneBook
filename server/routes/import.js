const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const { executeQuery } = require('../utils/database');
const { detectDuplicates } = require('../services/duplicateDetector');
const { parseRawContactData } = require('../services/contactParser');
const { importGmailContacts } = require('../services/gmailService');
const { importZohoContacts } = require('../services/zohoService');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.csv');
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Import CSV contacts
router.post('/csv', authenticateToken, upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required' });
    }

    const { fieldMapping, defaultRelationshipType = 'Other', defaultDataOwner } = req.body;
    
    if (!fieldMapping) {
      return res.status(400).json({ error: 'Field mapping is required' });
    }

    const contacts = [];
    const errors = [];

    // Parse CSV file
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (row) => {
        try {
          const contact = {
            first_name: row[fieldMapping.first_name] || '',
            last_name: row[fieldMapping.last_name] || '',
            phone_number: row[fieldMapping.phone_number] || '',
            email: row[fieldMapping.email] || '',
            relationship_type: row[fieldMapping.relationship_type] || defaultRelationshipType,
            data_owner: row[fieldMapping.data_owner] || defaultDataOwner,
            source: 'CSV'
          };

          // Basic validation
          if (!contact.first_name || !contact.phone_number) {
            errors.push({
              row: contacts.length + 1,
              error: 'Missing required fields (first_name or phone_number)',
              data: row
            });
            return;
          }

          contacts.push(contact);
        } catch (error) {
          errors.push({
            row: contacts.length + 1,
            error: 'Failed to parse row',
            data: row
          });
        }
      })
      .on('end', async () => {
        try {
          // Clean up uploaded file
          fs.unlinkSync(req.file.path);

          if (contacts.length === 0) {
            return res.status(400).json({ 
              error: 'No valid contacts found in CSV file',
              errors 
            });
          }

          // Check for duplicates and insert valid contacts
          const duplicateResults = [];
          const validContacts = [];
          const insertedContacts = [];

          for (const contact of contacts) {
            const duplicateCheck = await detectDuplicates(contact);
            
            if (duplicateCheck.hasDuplicates) {
              duplicateResults.push({
                contact,
                duplicates: duplicateCheck.duplicates
              });
            } else {
              validContacts.push(contact);
            }
          }

          // Insert valid contacts
          for (const contact of validContacts) {
            try {
              const result = await executeQuery(
                `INSERT INTO contacts (
                  first_name, last_name, phone_number, email, relationship_type,
                  data_owner, source, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *`,
                [
                  contact.first_name,
                  contact.last_name,
                  contact.phone_number,
                  contact.email,
                  contact.relationship_type,
                  contact.data_owner,
                  contact.source,
                  req.user.id
                ]
              );
              insertedContacts.push(result.rows[0]);
            } catch (error) {
              errors.push({
                contact,
                error: 'Failed to insert contact',
                details: error.message
              });
            }
          }

          res.json({
            message: 'CSV import completed',
            summary: {
              total: contacts.length,
              imported: insertedContacts.length,
              duplicates: duplicateResults.length,
              errors: errors.length
            },
            imported: insertedContacts,
            duplicates: duplicateResults,
            errors
          });

        } catch (error) {
          console.error('CSV import error:', error);
          res.status(500).json({ error: 'Failed to process CSV import' });
        }
      })
      .on('error', (error) => {
        console.error('CSV parsing error:', error);
        res.status(500).json({ error: 'Failed to parse CSV file' });
      });

  } catch (error) {
    console.error('CSV import error:', error);
    res.status(500).json({ error: 'Failed to import CSV file' });
  }
});

// Import Gmail contacts
router.post('/gmail', authenticateToken, async (req, res) => {
  try {
    const { accessToken, relationshipType = 'Other', dataOwner } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'Gmail access token is required' });
    }

    // Import contacts from Gmail
    const gmailContacts = await importGmailContacts(accessToken);

    if (gmailContacts.length === 0) {
      return res.status(400).json({ error: 'No contacts found in Gmail account' });
    }

    // Process and insert contacts
    const duplicateResults = [];
    const validContacts = [];
    const insertedContacts = [];

    for (const contact of gmailContacts) {
      const contactData = {
        first_name: contact.firstName || '',
        last_name: contact.lastName || '',
        phone_number: contact.phoneNumber || '',
        email: contact.email || '',
        relationship_type: relationshipType,
        data_owner: dataOwner,
        source: 'Gmail'
      };

      const duplicateCheck = await detectDuplicates(contactData);
      
      if (duplicateCheck.hasDuplicates) {
        duplicateResults.push({
          contact: contactData,
          duplicates: duplicateCheck.duplicates
        });
      } else {
        validContacts.push(contactData);
      }
    }

    // Insert valid contacts
    for (const contact of validContacts) {
      try {
        const result = await executeQuery(
          `INSERT INTO contacts (
            first_name, last_name, phone_number, email, relationship_type,
            data_owner, source, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *`,
          [
            contact.first_name,
            contact.last_name,
            contact.phone_number,
            contact.email,
            contact.relationship_type,
            contact.data_owner,
            contact.source,
            req.user.id
          ]
        );
        insertedContacts.push(result.rows[0]);
      } catch (error) {
        console.error('Failed to insert Gmail contact:', error);
      }
    }

    res.json({
      message: 'Gmail import completed',
      summary: {
        total: gmailContacts.length,
        imported: insertedContacts.length,
        duplicates: duplicateResults.length
      },
      imported: insertedContacts,
      duplicates: duplicateResults
    });

  } catch (error) {
    console.error('Gmail import error:', error);
    res.status(500).json({ error: 'Failed to import Gmail contacts' });
  }
});

// Import Zoho CRM contacts
router.post('/zoho', authenticateToken, async (req, res) => {
  try {
    const { accessToken, relationshipType = 'Other', dataOwner } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'Zoho access token is required' });
    }

    // Import contacts from Zoho CRM
    const zohoContacts = await importZohoContacts(accessToken);

    if (zohoContacts.length === 0) {
      return res.status(400).json({ error: 'No contacts found in Zoho CRM' });
    }

    // Process and insert contacts
    const duplicateResults = [];
    const validContacts = [];
    const insertedContacts = [];

    for (const contact of zohoContacts) {
      const contactData = {
        first_name: contact.firstName || '',
        last_name: contact.lastName || '',
        phone_number: contact.phoneNumber || '',
        email: contact.email || '',
        relationship_type: contact.relationshipType || relationshipType,
        data_owner: dataOwner,
        source: 'Zoho'
      };

      const duplicateCheck = await detectDuplicates(contactData);
      
      if (duplicateCheck.hasDuplicates) {
        duplicateResults.push({
          contact: contactData,
          duplicates: duplicateCheck.duplicates
        });
      } else {
        validContacts.push(contactData);
      }
    }

    // Insert valid contacts
    for (const contact of validContacts) {
      try {
        const result = await executeQuery(
          `INSERT INTO contacts (
            first_name, last_name, phone_number, email, relationship_type,
            data_owner, source, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *`,
          [
            contact.first_name,
            contact.last_name,
            contact.phone_number,
            contact.email,
            contact.relationship_type,
            contact.data_owner,
            contact.source,
            req.user.id
          ]
        );
        insertedContacts.push(result.rows[0]);
      } catch (error) {
        console.error('Failed to insert Zoho contact:', error);
      }
    }

    res.json({
      message: 'Zoho CRM import completed',
      summary: {
        total: zohoContacts.length,
        imported: insertedContacts.length,
        duplicates: duplicateResults.length
      },
      imported: insertedContacts,
      duplicates: duplicateResults
    });

  } catch (error) {
    console.error('Zoho import error:', error);
    res.status(500).json({ error: 'Failed to import Zoho CRM contacts' });
  }
});

// Get available import sources
router.get('/sources', authenticateToken, async (req, res) => {
  try {
    const sources = [
      {
        id: 'csv',
        name: 'CSV File',
        description: 'Import contacts from CSV files',
        fields: ['first_name', 'last_name', 'phone_number', 'email', 'relationship_type', 'data_owner'],
        supported: true
      },
      {
        id: 'gmail',
        name: 'Gmail',
        description: 'Import contacts from Gmail account',
        fields: ['first_name', 'last_name', 'phone_number', 'email'],
        supported: true,
        requiresAuth: true
      },
      {
        id: 'zoho',
        name: 'Zoho CRM',
        description: 'Import contacts from Zoho CRM',
        fields: ['first_name', 'last_name', 'phone_number', 'email', 'relationship_type'],
        supported: true,
        requiresAuth: true
      },
      {
        id: 'invoice_system',
        name: 'Invoice System',
        description: 'Import contacts from Invoice System',
        fields: ['first_name', 'last_name', 'phone_number', 'email', 'relationship_type'],
        supported: false,
        comingSoon: true
      },
      {
        id: 'raw_data',
        name: 'Raw Data',
        description: 'Paste raw contact data for automatic parsing',
        fields: ['first_name', 'last_name', 'phone_number', 'email', 'relationship_type'],
        supported: true
      }
    ];

    res.json({ sources });

  } catch (error) {
    console.error('Get import sources error:', error);
    res.status(500).json({ error: 'Failed to fetch import sources' });
  }
});

// Validate import data
router.post('/validate', authenticateToken, async (req, res) => {
  try {
    const { contacts, source } = req.body;

    if (!contacts || !Array.isArray(contacts)) {
      return res.status(400).json({ error: 'Contacts array is required' });
    }

    const validationResults = [];
    const duplicateResults = [];

    for (const contact of contacts) {
      const validation = {
        contact,
        isValid: true,
        errors: []
      };

      // Validate required fields
      if (!contact.first_name) {
        validation.isValid = false;
        validation.errors.push('First name is required');
      }

      if (!contact.phone_number) {
        validation.isValid = false;
        validation.errors.push('Phone number is required');
      }

      // Validate email format
      if (contact.email && !contact.email.includes('@')) {
        validation.isValid = false;
        validation.errors.push('Invalid email format');
      }

      // Validate relationship type
      const validTypes = ['Client', 'Vendor', 'Lead', 'Partner', 'Other'];
      if (contact.relationship_type && !validTypes.includes(contact.relationship_type)) {
        validation.isValid = false;
        validation.errors.push('Invalid relationship type');
      }

      validationResults.push(validation);

      // Check for duplicates if contact is valid
      if (validation.isValid) {
        const duplicateCheck = await detectDuplicates(contact);
        if (duplicateCheck.hasDuplicates) {
          duplicateResults.push({
            contact,
            duplicates: duplicateCheck.duplicates
          });
        }
      }
    }

    res.json({
      validationResults,
      duplicateResults,
      summary: {
        total: contacts.length,
        valid: validationResults.filter(v => v.isValid).length,
        invalid: validationResults.filter(v => !v.isValid).length,
        duplicates: duplicateResults.length
      }
    });

  } catch (error) {
    console.error('Validate import data error:', error);
    res.status(500).json({ error: 'Failed to validate import data' });
  }
});

module.exports = router; 