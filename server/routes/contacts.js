const express = require('express');
const { body, validationResult } = require('express-validator');
const { executeQuery, executeSingleQuery } = require('../utils/database');
const { authenticateToken } = require('../middleware/auth');
const { parseRawContactData } = require('../services/contactParser');
const { detectDuplicates } = require('../services/duplicateDetector');

const router = express.Router();

// Validation middleware
const validateContact = [
  body('first_name').notEmpty().withMessage('First name is required'),
  body('phone_number').notEmpty().withMessage('Phone number is required'),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
  body('relationship_type').isIn(['Client', 'Vendor', 'Lead', 'Partner', 'Other']).withMessage('Invalid relationship type'),
  body('data_owner').optional().isString().withMessage('Data owner must be a string'),
  body('source').isIn(['Gmail', 'Zoho', 'Invoice System', 'CSV', 'Raw Data']).withMessage('Invalid source')
];

// Get all contacts with filtering and pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      relationship_type = '',
      data_owner = '',
      source = '',
      status = ''
    } = req.query;

    const offset = (page - 1) * limit;
    
    // Build WHERE clause
    const whereConditions = [];
    const queryParams = [];
    let paramCount = 1;

    if (search) {
      whereConditions.push(`(first_name LIKE ? OR last_name LIKE ? OR phone_number LIKE ? OR email LIKE ?)`);
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (relationship_type) {
      whereConditions.push(`relationship_type = ?`);
      queryParams.push(relationship_type);
    }

    if (data_owner) {
      whereConditions.push(`data_owner = ?`);
      queryParams.push(data_owner);
    }

    if (source) {
      whereConditions.push(`source = ?`);
      queryParams.push(source);
    }

    if (status) {
      whereConditions.push(`status = ?`);
      queryParams.push(status);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM contacts ${whereClause}`;
    const countResult = await executeQuery(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0]['COUNT(*)']);

    // Get contacts
    const contactsQuery = `
      SELECT 
        id, first_name, last_name, phone_number, email, 
        relationship_type, data_owner, source, status, notes,
        created_at, updated_at
      FROM contacts 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const contactsResult = await executeQuery(contactsQuery, [...queryParams, limit, offset]);

    res.json({
      contacts: contactsResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// Get contact by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await executeQuery(
      'SELECT * FROM contacts WHERE id = ?',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ contact: result.rows[0] });

  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
});

// Create new contact
router.post('/', authenticateToken, validateContact, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const {
      first_name,
      last_name,
      phone_number,
      email,
      relationship_type,
      data_owner,
      source,
      status = 'Active',
      notes
    } = req.body;

    // Check for duplicates
    const duplicateCheck = await detectDuplicates({
      phone_number,
      email,
      first_name,
      last_name
    });

    if (duplicateCheck.hasDuplicates) {
      return res.status(409).json({
        error: 'Duplicate contact found',
        duplicates: duplicateCheck.duplicates
      });
    }

    // Create contact
    const result = await executeSingleQuery(
      `INSERT INTO contacts (
        first_name, last_name, phone_number, email, relationship_type,
        data_owner, source, status, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        first_name, last_name, phone_number, email, relationship_type,
        data_owner, source, status, notes, req.user.id
      ]
    );

    // Get the created contact
    const contactResult = await executeQuery(
      'SELECT * FROM contacts WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Contact created successfully',
      contact: contactResult.rows[0]
    });

  } catch (error) {
    console.error('Create contact error:', error);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

// Update contact
router.put('/:id', authenticateToken, validateContact, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { id } = req.params;
    const {
      first_name,
      last_name,
      phone_number,
      email,
      relationship_type,
      data_owner,
      source,
      status,
      notes
    } = req.body;

    // Check if contact exists
    const existingContact = await executeQuery(
      'SELECT * FROM contacts WHERE id = ?',
      [id]
    );

    if (existingContact.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Check for duplicates (excluding current contact)
    const duplicateCheck = await detectDuplicates({
      phone_number,
      email,
      first_name,
      last_name
    }, id);

    if (duplicateCheck.hasDuplicates) {
      return res.status(409).json({
        error: 'Duplicate contact found',
        duplicates: duplicateCheck.duplicates
      });
    }

    // Update contact
    await executeSingleQuery(
      `UPDATE contacts SET 
        first_name = ?, last_name = ?, phone_number = ?, email = ?,
        relationship_type = ?, data_owner = ?, source = ?, status = ?,
        notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        first_name, last_name, phone_number, email, relationship_type,
        data_owner, source, status, notes, id
      ]
    );

    const result = await executeQuery(
      'SELECT * FROM contacts WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Contact updated successfully',
      contact: result.rows[0]
    });

  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// Delete contact
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await executeSingleQuery(
      'DELETE FROM contacts WHERE id = ?',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ message: 'Contact deleted successfully' });

  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// Import raw contact data
router.post('/import/raw', authenticateToken, async (req, res) => {
  try {
    const { rawData } = req.body;

    if (!rawData || typeof rawData !== 'string') {
      return res.status(400).json({ error: 'Raw data is required' });
    }

    // Parse raw data
    const parsedContacts = await parseRawContactData(rawData);

    if (parsedContacts.length === 0) {
      return res.status(400).json({ error: 'No valid contacts found in the raw data' });
    }

    // Check for duplicates
    const duplicateResults = [];
    const validContacts = [];

    for (const contact of parsedContacts) {
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
    const insertedContacts = [];
    for (const contact of validContacts) {
      const result = await executeSingleQuery(
        `INSERT INTO contacts (
          first_name, last_name, phone_number, email, relationship_type,
          data_owner, source, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          contact.first_name,
          contact.last_name,
          contact.phone_number,
          contact.email,
          contact.relationship_type || 'Other',
          contact.data_owner,
          'Raw Data',
          req.user.id
        ]
      );

      const contactResult = await executeQuery(
        'SELECT * FROM contacts WHERE id = ?',
        [result.insertId]
      );
      insertedContacts.push(contactResult.rows[0]);
    }

    res.json({
      message: 'Raw data import completed',
      summary: {
        total: parsedContacts.length,
        imported: insertedContacts.length,
        duplicates: duplicateResults.length,
        failed: parsedContacts.length - insertedContacts.length - duplicateResults.length
      },
      imported: insertedContacts,
      duplicates: duplicateResults
    });

  } catch (error) {
    console.error('Raw import error:', error);
    res.status(500).json({ error: 'Failed to import raw data' });
  }
});

// Get contact statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    // Get counts by relationship type
    const relationshipStats = await executeQuery(`
      SELECT relationship_type, COUNT(*) as count
      FROM contacts
      GROUP BY relationship_type
      ORDER BY count DESC
    `);

    // Get counts by source
    const sourceStats = await executeQuery(`
      SELECT source, COUNT(*) as count
      FROM contacts
      GROUP BY source
      ORDER BY count DESC
    `);

    // Get counts by data owner
    const ownerStats = await executeQuery(`
      SELECT data_owner, COUNT(*) as count
      FROM contacts
      WHERE data_owner IS NOT NULL
      GROUP BY data_owner
      ORDER BY count DESC
    `);

    // Get total counts
    const totalResult = await executeQuery('SELECT COUNT(*) as total FROM contacts');
    const activeResult = await executeQuery("SELECT COUNT(*) as active FROM contacts WHERE status = 'Active'");

    res.json({
      total: parseInt(totalResult.rows[0]['COUNT(*)']),
      active: parseInt(activeResult.rows[0]['COUNT(*)']),
      byRelationship: relationshipStats.rows,
      bySource: sourceStats.rows,
      byOwner: ownerStats.rows
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router; 