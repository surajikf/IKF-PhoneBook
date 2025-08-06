// Gmail integration service
const { google } = require('googleapis');

// Gmail API scopes
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/contacts.readonly'
];

// Create OAuth2 client
const createOAuth2Client = (accessToken) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
  );
  
  oauth2Client.setCredentials({
    access_token: accessToken
  });
  
  return oauth2Client;
};

// Get Gmail contacts
const getGmailContacts = async (accessToken) => {
  try {
    const oauth2Client = createOAuth2Client(accessToken);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const people = google.people({ version: 'v1', auth: oauth2Client });
    
    const contacts = [];
    
    // Get contacts from Gmail
    const response = await people.people.connections.list({
      resourceName: 'people/me',
      pageSize: 1000,
      personFields: 'names,emailAddresses,phoneNumbers'
    });
    
    if (response.data.connections) {
      for (const person of response.data.connections) {
        const contact = parseGmailContact(person);
        if (contact) {
          contacts.push(contact);
        }
      }
    }
    
    return contacts;
    
  } catch (error) {
    console.error('Gmail contacts fetch error:', error);
    throw new Error('Failed to fetch Gmail contacts');
  }
};

// Parse Gmail contact data
const parseGmailContact = (person) => {
  try {
    const contact = {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: ''
    };
    
    // Parse name
    if (person.names && person.names.length > 0) {
      const name = person.names[0];
      contact.firstName = name.givenName || '';
      contact.lastName = name.familyName || '';
    }
    
    // Parse email addresses
    if (person.emailAddresses && person.emailAddresses.length > 0) {
      // Prefer primary email or first email
      const primaryEmail = person.emailAddresses.find(email => email.metadata?.primary) || person.emailAddresses[0];
      contact.email = primaryEmail.value || '';
    }
    
    // Parse phone numbers
    if (person.phoneNumbers && person.phoneNumbers.length > 0) {
      // Prefer mobile or first phone number
      const mobilePhone = person.phoneNumbers.find(phone => 
        phone.metadata?.primary || 
        phone.metadata?.source?.type === 'PROFILE' ||
        phone.formattedType?.toLowerCase().includes('mobile')
      ) || person.phoneNumbers[0];
      
      contact.phoneNumber = mobilePhone.canonicalForm || mobilePhone.value || '';
    }
    
    // Only return contact if we have at least a name or email
    if (contact.firstName || contact.lastName || contact.email) {
      return contact;
    }
    
    return null;
    
  } catch (error) {
    console.error('Parse Gmail contact error:', error);
    return null;
  }
};

// Import Gmail contacts
const importGmailContacts = async (accessToken) => {
  try {
    const contacts = await getGmailContacts(accessToken);
    
    // Filter out contacts without essential information
    const validContacts = contacts.filter(contact => 
      contact.firstName || contact.lastName || contact.email
    );
    
    return validContacts;
    
  } catch (error) {
    console.error('Gmail import error:', error);
    throw error;
  }
};

// Get Gmail authentication URL
const getGmailAuthUrl = () => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
  );
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
  
  return authUrl;
};

// Exchange authorization code for tokens
const exchangeCodeForTokens = async (code) => {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
    );
    
    const { tokens } = await oauth2Client.getToken(code);
    
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date
    };
    
  } catch (error) {
    console.error('Token exchange error:', error);
    throw new Error('Failed to exchange authorization code for tokens');
  }
};

// Refresh access token
const refreshAccessToken = async (refreshToken) => {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
    );
    
    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });
    
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    return {
      access_token: credentials.access_token,
      expiry_date: credentials.expiry_date
    };
    
  } catch (error) {
    console.error('Token refresh error:', error);
    throw new Error('Failed to refresh access token');
  }
};

// Validate Gmail access token
const validateGmailToken = async (accessToken) => {
  try {
    const oauth2Client = createOAuth2Client(accessToken);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // Try to get user profile to validate token
    const response = await gmail.users.getProfile({
      userId: 'me'
    });
    
    return {
      valid: true,
      email: response.data.emailAddress,
      name: response.data.messagesTotal ? 'Gmail User' : 'Unknown'
    };
    
  } catch (error) {
    console.error('Gmail token validation error:', error);
    return {
      valid: false,
      error: error.message
    };
  }
};

// Get Gmail account info
const getGmailAccountInfo = async (accessToken) => {
  try {
    const oauth2Client = createOAuth2Client(accessToken);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const people = google.people({ version: 'v1', auth: oauth2Client });
    
    // Get profile information
    const profileResponse = await people.people.get({
      resourceName: 'people/me',
      personFields: 'names,emailAddresses,photos'
    });
    
    const profile = profileResponse.data;
    
    return {
      email: profile.emailAddresses?.[0]?.value || '',
      name: profile.names?.[0]?.displayName || '',
      photo: profile.photos?.[0]?.url || '',
      resourceName: profile.resourceName
    };
    
  } catch (error) {
    console.error('Get Gmail account info error:', error);
    throw new Error('Failed to get Gmail account information');
  }
};

module.exports = {
  importGmailContacts,
  getGmailContacts,
  getGmailAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  validateGmailToken,
  getGmailAccountInfo,
  parseGmailContact
}; 