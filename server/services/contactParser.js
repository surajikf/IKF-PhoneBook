// Raw contact data parsing service
const { executeQuery } = require('../utils/database');

// Phone number validation and formatting
const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle different formats
  if (cleaned.length === 10) {
    // US format: (123) 456-7890
    return `+1${cleaned}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    // US format with country code: 1-123-456-7890
    return `+${cleaned}`;
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    // Indian format: +91-123-456-7890
    return `+${cleaned}`;
  } else if (cleaned.length >= 10) {
    // International format
    return `+${cleaned}`;
  }
  
  return phone; // Return original if can't format
};

// Email validation
const validateEmail = (email) => {
  if (!email) return null;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) ? email : null;
};

// Relationship type detection
const detectRelationshipType = (text) => {
  if (!text) return 'Other';
  
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('client') || lowerText.includes('customer')) {
    return 'Client';
  } else if (lowerText.includes('vendor') || lowerText.includes('supplier')) {
    return 'Vendor';
  } else if (lowerText.includes('lead') || lowerText.includes('prospect')) {
    return 'Lead';
  } else if (lowerText.includes('partner') || lowerText.includes('associate')) {
    return 'Partner';
  }
  
  return 'Other';
};

// Name parsing
const parseName = (nameText) => {
  if (!nameText) return { first_name: '', last_name: '' };
  
  const name = nameText.trim();
  const parts = name.split(/\s+/);
  
  if (parts.length === 1) {
    return { first_name: parts[0], last_name: '' };
  } else if (parts.length === 2) {
    return { first_name: parts[0], last_name: parts[1] };
  } else {
    // For names with more than 2 parts, treat first as first name, rest as last name
    return { 
      first_name: parts[0], 
      last_name: parts.slice(1).join(' ') 
    };
  }
};

// Parse raw contact data
const parseRawContactData = async (rawData) => {
  const contacts = [];
  const lines = rawData.split('\n').filter(line => line.trim());
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    try {
      const contact = parseContactLine(line);
      if (contact && contact.first_name && contact.phone_number) {
        contacts.push(contact);
      }
    } catch (error) {
      console.error(`Error parsing line ${i + 1}:`, error);
    }
  }
  
  return contacts;
};

// Parse a single line of contact data
const parseContactLine = (line) => {
  // Try different parsing strategies
  
  // Strategy 1: Comma-separated format
  const commaSeparated = parseCommaSeparated(line);
  if (commaSeparated) return commaSeparated;
  
  // Strategy 2: Tab-separated format
  const tabSeparated = parseTabSeparated(line);
  if (tabSeparated) return tabSeparated;
  
  // Strategy 3: Space-separated format
  const spaceSeparated = parseSpaceSeparated(line);
  if (spaceSeparated) return spaceSeparated;
  
  // Strategy 4: Pattern-based parsing
  const patternParsed = parseByPattern(line);
  if (patternParsed) return patternParsed;
  
  return null;
};

// Parse comma-separated format: "Name, Phone, Email, Type"
const parseCommaSeparated = (line) => {
  const parts = line.split(',').map(part => part.trim());
  
  if (parts.length < 2) return null;
  
  const contact = {};
  
  // First part is usually name
  const nameInfo = parseName(parts[0]);
  contact.first_name = nameInfo.first_name;
  contact.last_name = nameInfo.last_name;
  
  // Second part is usually phone
  if (parts[1]) {
    contact.phone_number = formatPhoneNumber(parts[1]);
  }
  
  // Third part might be email
  if (parts[2]) {
    contact.email = validateEmail(parts[2]);
  }
  
  // Fourth part might be relationship type
  if (parts[3]) {
    contact.relationship_type = detectRelationshipType(parts[3]);
  }
  
  return contact;
};

// Parse tab-separated format
const parseTabSeparated = (line) => {
  const parts = line.split('\t').map(part => part.trim());
  
  if (parts.length < 2) return null;
  
  const contact = {};
  
  // First part is usually name
  const nameInfo = parseName(parts[0]);
  contact.first_name = nameInfo.first_name;
  contact.last_name = nameInfo.last_name;
  
  // Second part is usually phone
  if (parts[1]) {
    contact.phone_number = formatPhoneNumber(parts[1]);
  }
  
  // Third part might be email
  if (parts[2]) {
    contact.email = validateEmail(parts[2]);
  }
  
  // Fourth part might be relationship type
  if (parts[3]) {
    contact.relationship_type = detectRelationshipType(parts[3]);
  }
  
  return contact;
};

// Parse space-separated format
const parseSpaceSeparated = (line) => {
  const parts = line.split(/\s+/);
  
  if (parts.length < 3) return null;
  
  const contact = {};
  
  // Try to identify phone number and email in the parts
  let nameParts = [];
  let phoneNumber = null;
  let email = null;
  let relationshipType = 'Other';
  
  for (const part of parts) {
    if (!phoneNumber && /[\d\-\(\)\s]/.test(part)) {
      phoneNumber = formatPhoneNumber(part);
    } else if (!email && part.includes('@')) {
      email = validateEmail(part);
    } else if (part.toLowerCase().match(/^(client|vendor|lead|partner|other)$/)) {
      relationshipType = part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    } else {
      nameParts.push(part);
    }
  }
  
  if (nameParts.length === 0 || !phoneNumber) return null;
  
  const nameInfo = parseName(nameParts.join(' '));
  contact.first_name = nameInfo.first_name;
  contact.last_name = nameInfo.last_name;
  contact.phone_number = phoneNumber;
  contact.email = email;
  contact.relationship_type = relationshipType;
  
  return contact;
};

// Parse by pattern matching
const parseByPattern = (line) => {
  // Phone number patterns
  const phonePatterns = [
    /(\+?\d{1,3}[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
    /(\+?\d{1,3}[-.\s]?)?([0-9]{3})[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g
  ];
  
  // Email pattern
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  
  // Extract phone number
  let phoneNumber = null;
  for (const pattern of phonePatterns) {
    const match = line.match(pattern);
    if (match) {
      phoneNumber = formatPhoneNumber(match[0]);
      break;
    }
  }
  
  // Extract email
  const emailMatch = line.match(emailPattern);
  const email = emailMatch ? validateEmail(emailMatch[0]) : null;
  
  // Extract name (everything before phone/email)
  let nameText = line;
  if (phoneNumber) {
    nameText = nameText.replace(phoneNumber, '').trim();
  }
  if (email) {
    nameText = nameText.replace(email, '').trim();
  }
  
  // Clean up name text
  nameText = nameText.replace(/[,;]/g, '').trim();
  
  if (!nameText || !phoneNumber) return null;
  
  const nameInfo = parseName(nameText);
  
  return {
    first_name: nameInfo.first_name,
    last_name: nameInfo.last_name,
    phone_number: phoneNumber,
    email: email,
    relationship_type: 'Other'
  };
};

// Validate parsed contact
const validateParsedContact = (contact) => {
  if (!contact.first_name || !contact.phone_number) {
    return false;
  }
  
  // Basic phone number validation
  if (contact.phone_number.length < 10) {
    return false;
  }
  
  // Email validation if present
  if (contact.email && !contact.email.includes('@')) {
    return false;
  }
  
  return true;
};

// Enhanced parsing with multiple strategies
const parseRawContactDataEnhanced = async (rawData) => {
  const contacts = [];
  const lines = rawData.split('\n').filter(line => line.trim());
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    try {
      // Try multiple parsing strategies
      let contact = parseContactLine(line);
      
      if (!contact) {
        // Try alternative parsing methods
        contact = parseAlternativeFormats(line);
      }
      
      if (contact && validateParsedContact(contact)) {
        contacts.push(contact);
      }
    } catch (error) {
      console.error(`Error parsing line ${i + 1}:`, error);
    }
  }
  
  return contacts;
};

// Parse alternative formats
const parseAlternativeFormats = (line) => {
  // Handle formats like "John Doe - +1-123-456-7890 - john@example.com"
  const dashSeparated = line.split(' - ').map(part => part.trim());
  
  if (dashSeparated.length >= 2) {
    const contact = {};
    
    // First part is name
    const nameInfo = parseName(dashSeparated[0]);
    contact.first_name = nameInfo.first_name;
    contact.last_name = nameInfo.last_name;
    
    // Second part might be phone
    if (dashSeparated[1]) {
      contact.phone_number = formatPhoneNumber(dashSeparated[1]);
    }
    
    // Third part might be email
    if (dashSeparated[2]) {
      contact.email = validateEmail(dashSeparated[2]);
    }
    
    return contact;
  }
  
  return null;
};

module.exports = {
  parseRawContactData,
  parseRawContactDataEnhanced,
  formatPhoneNumber,
  validateEmail,
  detectRelationshipType,
  parseName,
  validateParsedContact
}; 