// Zoho CRM integration service
const axios = require('axios');

// Zoho API configuration
const ZOHO_API_BASE = 'https://www.zohoapis.com/crm/v3';
const ZOHO_AUTH_URL = 'https://accounts.zoho.com/oauth/v2/auth';
const ZOHO_TOKEN_URL = 'https://accounts.zoho.com/oauth/v2/token';

// Create Zoho API client
const createZohoClient = (accessToken) => {
  return axios.create({
    baseURL: ZOHO_API_BASE,
    headers: {
      'Authorization': `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
};

// Get Zoho authentication URL
const getZohoAuthUrl = () => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.ZOHO_CLIENT_ID,
    redirect_uri: process.env.ZOHO_REDIRECT_URI || 'http://localhost:3000/auth/zoho/callback',
    scope: 'ZohoCRM.modules.ALL,ZohoCRM.settings.ALL',
    access_type: 'offline',
    prompt: 'consent'
  });
  
  return `${ZOHO_AUTH_URL}?${params.toString()}`;
};

// Exchange authorization code for tokens
const exchangeCodeForTokens = async (code) => {
  try {
    const params = new URLSearchParams({
      code: code,
      grant_type: 'authorization_code',
      client_id: process.env.ZOHO_CLIENT_ID,
      client_secret: process.env.ZOHO_CLIENT_SECRET,
      redirect_uri: process.env.ZOHO_REDIRECT_URI || 'http://localhost:3000/auth/zoho/callback'
    });
    
    const response = await axios.post(ZOHO_TOKEN_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_in: response.data.expires_in,
      api_domain: response.data.api_domain
    };
    
  } catch (error) {
    console.error('Zoho token exchange error:', error);
    throw new Error('Failed to exchange authorization code for tokens');
  }
};

// Refresh access token
const refreshAccessToken = async (refreshToken) => {
  try {
    const params = new URLSearchParams({
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      client_id: process.env.ZOHO_CLIENT_ID,
      client_secret: process.env.ZOHO_CLIENT_SECRET
    });
    
    const response = await axios.post(ZOHO_TOKEN_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    return {
      access_token: response.data.access_token,
      expires_in: response.data.expires_in,
      api_domain: response.data.api_domain
    };
    
  } catch (error) {
    console.error('Zoho token refresh error:', error);
    throw new Error('Failed to refresh access token');
  }
};

// Get Zoho contacts
const getZohoContacts = async (accessToken) => {
  try {
    const client = createZohoClient(accessToken);
    
    const contacts = [];
    let page = 1;
    let hasMoreRecords = true;
    
    while (hasMoreRecords) {
      const response = await client.get('/Contacts', {
        params: {
          page: page,
          per_page: 200,
          fields: 'First_Name,Last_Name,Email,Phone,Account_Name,Lead_Source,Lead_Status'
        }
      });
      
      if (response.data.data) {
        for (const contact of response.data.data) {
          const parsedContact = parseZohoContact(contact);
          if (parsedContact) {
            contacts.push(parsedContact);
          }
        }
      }
      
      // Check if there are more records
      hasMoreRecords = response.data.info && response.data.info.more_records;
      page++;
      
      // Limit to prevent infinite loops
      if (page > 50) break;
    }
    
    return contacts;
    
  } catch (error) {
    console.error('Zoho contacts fetch error:', error);
    throw new Error('Failed to fetch Zoho contacts');
  }
};

// Parse Zoho contact data
const parseZohoContact = (contact) => {
  try {
    const parsed = {
      firstName: contact.First_Name || '',
      lastName: contact.Last_Name || '',
      email: contact.Email || '',
      phoneNumber: contact.Phone || '',
      relationshipType: 'Other',
      accountName: contact.Account_Name || '',
      leadSource: contact.Lead_Source || '',
      leadStatus: contact.Lead_Status || ''
    };
    
    // Determine relationship type based on lead source and status
    if (parsed.leadSource) {
      const source = parsed.leadSource.toLowerCase();
      if (source.includes('client') || source.includes('customer')) {
        parsed.relationshipType = 'Client';
      } else if (source.includes('vendor') || source.includes('supplier')) {
        parsed.relationshipType = 'Vendor';
      } else if (source.includes('lead') || source.includes('prospect')) {
        parsed.relationshipType = 'Lead';
      } else if (source.includes('partner')) {
        parsed.relationshipType = 'Partner';
      }
    }
    
    // Only return contact if we have at least a name or email
    if (parsed.firstName || parsed.lastName || parsed.email) {
      return parsed;
    }
    
    return null;
    
  } catch (error) {
    console.error('Parse Zoho contact error:', error);
    return null;
  }
};

// Import Zoho contacts
const importZohoContacts = async (accessToken) => {
  try {
    const contacts = await getZohoContacts(accessToken);
    
    // Filter out contacts without essential information
    const validContacts = contacts.filter(contact => 
      contact.firstName || contact.lastName || contact.email
    );
    
    return validContacts;
    
  } catch (error) {
    console.error('Zoho import error:', error);
    throw error;
  }
};

// Validate Zoho access token
const validateZohoToken = async (accessToken) => {
  try {
    const client = createZohoClient(accessToken);
    
    // Try to get user info to validate token
    const response = await client.get('/org');
    
    return {
      valid: true,
      orgName: response.data.org?.[0]?.name || 'Unknown',
      orgId: response.data.org?.[0]?.id || 'Unknown'
    };
    
  } catch (error) {
    console.error('Zoho token validation error:', error);
    return {
      valid: false,
      error: error.message
    };
  }
};

// Get Zoho account info
const getZohoAccountInfo = async (accessToken) => {
  try {
    const client = createZohoClient(accessToken);
    
    // Get organization info
    const orgResponse = await client.get('/org');
    const org = orgResponse.data.org?.[0];
    
    // Get user info
    const userResponse = await client.get('/users');
    const user = userResponse.data.users?.[0];
    
    return {
      orgName: org?.name || 'Unknown Organization',
      orgId: org?.id || 'Unknown',
      userName: user?.full_name || 'Unknown User',
      userEmail: user?.email || 'Unknown',
      orgCountry: org?.country || 'Unknown',
      orgTimezone: org?.time_zone || 'Unknown'
    };
    
  } catch (error) {
    console.error('Get Zoho account info error:', error);
    throw new Error('Failed to get Zoho account information');
  }
};

// Get Zoho modules (for field mapping)
const getZohoModules = async (accessToken) => {
  try {
    const client = createZohoClient(accessToken);
    
    const response = await client.get('/settings/modules');
    
    return response.data.modules || [];
    
  } catch (error) {
    console.error('Get Zoho modules error:', error);
    throw new Error('Failed to get Zoho modules');
  }
};

// Get Zoho contact fields
const getZohoContactFields = async (accessToken) => {
  try {
    const client = createZohoClient(accessToken);
    
    const response = await client.get('/settings/fields', {
      params: {
        module: 'Contacts'
      }
    });
    
    return response.data.fields || [];
    
  } catch (error) {
    console.error('Get Zoho contact fields error:', error);
    throw new Error('Failed to get Zoho contact fields');
  }
};

// Search Zoho contacts
const searchZohoContacts = async (accessToken, searchTerm) => {
  try {
    const client = createZohoClient(accessToken);
    
    const response = await client.get('/Contacts/search', {
      params: {
        word: searchTerm,
        fields: 'First_Name,Last_Name,Email,Phone,Account_Name,Lead_Source,Lead_Status'
      }
    });
    
    const contacts = [];
    if (response.data.data) {
      for (const contact of response.data.data) {
        const parsedContact = parseZohoContact(contact);
        if (parsedContact) {
          contacts.push(parsedContact);
        }
      }
    }
    
    return contacts;
    
  } catch (error) {
    console.error('Search Zoho contacts error:', error);
    throw new Error('Failed to search Zoho contacts');
  }
};

// Get Zoho contact by ID
const getZohoContactById = async (accessToken, contactId) => {
  try {
    const client = createZohoClient(accessToken);
    
    const response = await client.get(`/Contacts/${contactId}`, {
      params: {
        fields: 'First_Name,Last_Name,Email,Phone,Account_Name,Lead_Source,Lead_Status,Description'
      }
    });
    
    if (response.data.data && response.data.data.length > 0) {
      return parseZohoContact(response.data.data[0]);
    }
    
    return null;
    
  } catch (error) {
    console.error('Get Zoho contact by ID error:', error);
    throw new Error('Failed to get Zoho contact');
  }
};

module.exports = {
  importZohoContacts,
  getZohoContacts,
  getZohoAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  validateZohoToken,
  getZohoAccountInfo,
  getZohoModules,
  getZohoContactFields,
  searchZohoContacts,
  getZohoContactById,
  parseZohoContact
}; 