// Duplicate detection service
const { executeQuery } = require('../utils/database');

// Calculate similarity between two strings (0-1)
const calculateSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  
  // Levenshtein distance for fuzzy matching
  const matrix = [];
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  const distance = matrix[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  
  return 1 - (distance / maxLength);
};

// Normalize phone number for comparison
const normalizePhoneNumber = (phone) => {
  if (!phone) return '';
  
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove country code if it's 1 (US)
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    cleaned = cleaned.substring(1);
  }
  
  return cleaned;
};

// Check if two phone numbers are similar
const arePhoneNumbersSimilar = (phone1, phone2) => {
  if (!phone1 || !phone2) return false;
  
  const normalized1 = normalizePhoneNumber(phone1);
  const normalized2 = normalizePhoneNumber(phone2);
  
  // Exact match
  if (normalized1 === normalized2) return true;
  
  // Check if one is a substring of the other (for partial matches)
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return true;
  }
  
  // Check similarity for close matches
  return calculateSimilarity(normalized1, normalized2) > 0.8;
};

// Check if two names are similar
const areNamesSimilar = (name1, name2) => {
  if (!name1 || !name2) return false;
  
  const similarity = calculateSimilarity(name1, name2);
  return similarity > 0.7; // 70% similarity threshold
};

// Check if two emails are similar
const areEmailsSimilar = (email1, email2) => {
  if (!email1 || !email2) return false;
  
  // Exact match
  if (email1.toLowerCase() === email2.toLowerCase()) return true;
  
  // Check if they're from the same domain
  const domain1 = email1.split('@')[1];
  const domain2 = email2.split('@')[1];
  
  if (domain1 && domain2 && domain1 === domain2) {
    // Same domain, check username similarity
    const username1 = email1.split('@')[0];
    const username2 = email2.split('@')[0];
    return calculateSimilarity(username1, username2) > 0.8;
  }
  
  return false;
};

// Detect duplicates for a given contact
const detectDuplicates = async (contact, excludeId = null) => {
  const duplicates = [];
  
  try {
    // Build query to find potential duplicates
    let query = `
      SELECT id, first_name, last_name, phone_number, email, 
             relationship_type, data_owner, source, created_at
      FROM contacts
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    // Add exclusion clause if provided
    if (excludeId) {
      query += ` AND id != $${paramCount}`;
      params.push(excludeId);
      paramCount++;
    }
    
    // Add conditions for potential matches
    const conditions = [];
    
    // Match by phone number
    if (contact.phone_number) {
      const normalizedPhone = normalizePhoneNumber(contact.phone_number);
      conditions.push(`(
        phone_number = $${paramCount} OR 
        phone_number LIKE $${paramCount + 1} OR
        phone_number LIKE $${paramCount + 2}
      )`);
      params.push(contact.phone_number);
      params.push(`%${normalizedPhone}%`);
      params.push(`%${contact.phone_number.replace(/\D/g, '')}%`);
      paramCount += 3;
    }
    
    // Match by email
    if (contact.email) {
      conditions.push(`email = $${paramCount}`);
      params.push(contact.email);
      paramCount++;
    }
    
    // Match by name (fuzzy matching)
    if (contact.first_name || contact.last_name) {
      const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
      if (fullName) {
        conditions.push(`(
          LOWER(first_name) = LOWER($${paramCount}) OR
          LOWER(last_name) = LOWER($${paramCount + 1}) OR
          LOWER(CONCAT(first_name, ' ', last_name)) = LOWER($${paramCount + 2})
        )`);
        params.push(contact.first_name || '');
        params.push(contact.last_name || '');
        params.push(fullName);
        paramCount += 3;
      }
    }
    
    if (conditions.length > 0) {
      query += ` AND (${conditions.join(' OR ')})`;
    }
    
    query += ` ORDER BY created_at DESC`;
    
    const result = await executeQuery(query, params);
    
    // Process results and calculate similarity scores
    for (const existingContact of result.rows) {
      let similarityScore = 0;
      let matchReasons = [];
      
      // Check phone number similarity
      if (contact.phone_number && existingContact.phone_number) {
        if (arePhoneNumbersSimilar(contact.phone_number, existingContact.phone_number)) {
          similarityScore += 0.4;
          matchReasons.push('Phone number match');
        }
      }
      
      // Check email similarity
      if (contact.email && existingContact.email) {
        if (areEmailsSimilar(contact.email, existingContact.email)) {
          similarityScore += 0.4;
          matchReasons.push('Email match');
        }
      }
      
      // Check name similarity
      const existingFullName = `${existingContact.first_name || ''} ${existingContact.last_name || ''}`.trim();
      const newFullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
      
      if (existingFullName && newFullName) {
        if (areNamesSimilar(existingFullName, newFullName)) {
          similarityScore += 0.3;
          matchReasons.push('Name similarity');
        }
      }
      
      // Consider it a duplicate if similarity score is high enough
      if (similarityScore >= 0.4) {
        duplicates.push({
          existingContact,
          similarityScore,
          matchReasons,
          isExactMatch: similarityScore >= 0.8
        });
      }
    }
    
    // Sort by similarity score (highest first)
    duplicates.sort((a, b) => b.similarityScore - a.similarityScore);
    
  } catch (error) {
    console.error('Duplicate detection error:', error);
  }
  
  return {
    hasDuplicates: duplicates.length > 0,
    duplicates: duplicates,
    totalDuplicates: duplicates.length
  };
};

// Merge duplicate contacts
const mergeContacts = async (primaryContactId, duplicateContactIds) => {
  try {
    // Get the primary contact
    const primaryResult = await executeQuery(
      'SELECT * FROM contacts WHERE id = $1',
      [primaryContactId]
    );
    
    if (primaryResult.rows.length === 0) {
      throw new Error('Primary contact not found');
    }
    
    const primaryContact = primaryResult.rows[0];
    
    // Get all duplicate contacts
    const duplicateIds = duplicateContactIds.join(',');
    const duplicatesResult = await executeQuery(
      `SELECT * FROM contacts WHERE id IN (${duplicateIds})`,
      []
    );
    
    // Merge data from duplicates into primary contact
    let mergedContact = { ...primaryContact };
    
    for (const duplicate of duplicatesResult.rows) {
      // Merge names if primary is missing
      if (!mergedContact.first_name && duplicate.first_name) {
        mergedContact.first_name = duplicate.first_name;
      }
      if (!mergedContact.last_name && duplicate.last_name) {
        mergedContact.last_name = duplicate.last_name;
      }
      
      // Merge phone numbers if primary is missing
      if (!mergedContact.phone_number && duplicate.phone_number) {
        mergedContact.phone_number = duplicate.phone_number;
      }
      
      // Merge email if primary is missing
      if (!mergedContact.email && duplicate.email) {
        mergedContact.email = duplicate.email;
      }
      
      // Merge relationship type if primary is missing
      if (!mergedContact.relationship_type && duplicate.relationship_type) {
        mergedContact.relationship_type = duplicate.relationship_type;
      }
      
      // Merge data owner if primary is missing
      if (!mergedContact.data_owner && duplicate.data_owner) {
        mergedContact.data_owner = duplicate.data_owner;
      }
      
      // Merge notes
      if (duplicate.notes) {
        mergedContact.notes = mergedContact.notes 
          ? `${mergedContact.notes}\n\nMerged from contact ID ${duplicate.id}: ${duplicate.notes}`
          : `Merged from contact ID ${duplicate.id}: ${duplicate.notes}`;
      }
    }
    
    // Update primary contact with merged data
    await executeQuery(
      `UPDATE contacts SET 
        first_name = $1, last_name = $2, phone_number = $3, email = $4,
        relationship_type = $5, data_owner = $6, notes = $7, updated_at = CURRENT_TIMESTAMP
      WHERE id = $8`,
      [
        mergedContact.first_name,
        mergedContact.last_name,
        mergedContact.phone_number,
        mergedContact.email,
        mergedContact.relationship_type,
        mergedContact.data_owner,
        mergedContact.notes,
        primaryContactId
      ]
    );
    
    // Delete duplicate contacts
    await executeQuery(
      `DELETE FROM contacts WHERE id IN (${duplicateIds})`,
      []
    );
    
    return {
      success: true,
      mergedContact: mergedContact,
      deletedCount: duplicateContactIds.length
    };
    
  } catch (error) {
    console.error('Merge contacts error:', error);
    throw error;
  }
};

// Get duplicate statistics
const getDuplicateStats = async () => {
  try {
    // Find potential duplicates based on phone number
    const phoneDuplicates = await executeQuery(`
      SELECT phone_number, COUNT(*) as count
      FROM contacts
      WHERE phone_number IS NOT NULL AND phone_number != ''
      GROUP BY phone_number
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);
    
    // Find potential duplicates based on email
    const emailDuplicates = await executeQuery(`
      SELECT email, COUNT(*) as count
      FROM contacts
      WHERE email IS NOT NULL AND email != ''
      GROUP BY email
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);
    
    // Find potential duplicates based on name
    const nameDuplicates = await executeQuery(`
      SELECT first_name, last_name, COUNT(*) as count
      FROM contacts
      WHERE first_name IS NOT NULL AND first_name != ''
      GROUP BY first_name, last_name
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);
    
    return {
      phoneDuplicates: phoneDuplicates.rows,
      emailDuplicates: emailDuplicates.rows,
      nameDuplicates: nameDuplicates.rows,
      totalPotentialDuplicates: phoneDuplicates.rows.length + emailDuplicates.rows.length + nameDuplicates.rows.length
    };
    
  } catch (error) {
    console.error('Get duplicate stats error:', error);
    throw error;
  }
};

module.exports = {
  detectDuplicates,
  mergeContacts,
  getDuplicateStats,
  calculateSimilarity,
  arePhoneNumbersSimilar,
  areNamesSimilar,
  areEmailsSimilar,
  normalizePhoneNumber
}; 