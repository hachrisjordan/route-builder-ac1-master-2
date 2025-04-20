/**
 * Service to handle access code validation from cloud storage or external API
 */

// Cloud storage URL where access codes are stored
const ACCESS_CODES_URL = 'https://storage.googleapis.com/exchange-rates-fabled-emblem-451602/access-codes.json';

/**
 * Fetches access codes from cloud storage or local file
 * @returns {Promise<Array>} Array of access codes with their expiry dates
 */
export const fetchAccessCodes = async () => {
  try {
    // Fetch the access codes from the cloud storage or local file
    const response = await fetch(ACCESS_CODES_URL);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch access codes: ${response.status}`);
    }
    
    const data = await response.json();
    return data.accessCodes || [];
  } catch (error) {
    console.error('Error fetching access codes:', error);
    
    // Fallback to local import in case of fetch failure
    try {
      // This dynamic import works in webpack environments
      const localCodes = await import('../data/access-codes.json');
      return localCodes.accessCodes || [];
    } catch (localError) {
      console.error('Failed to load local access codes:', localError);
      return [];
    }
  }
};

/**
 * Validates an access code against the list of valid codes
 * @param {string} code - The access code to validate
 * @returns {Promise<{isValid: boolean, expiryDate: string|null, description: string|null}>}
 */
export const validateAccessCode = async (code) => {
  const accessCodes = await fetchAccessCodes();
  
  // Case insensitive comparison
  const normalizedCode = code.toLowerCase().trim();
  
  // Find a matching code
  const matchingCode = accessCodes.find(
    accessCode => accessCode.code.toLowerCase() === normalizedCode
  );
  
  if (!matchingCode) {
    return { isValid: false, expiryDate: null, description: null };
  }
  
  // Check if the code has expired
  const currentDate = new Date();
  const expiryDate = new Date(matchingCode.expiryDate);
  
  if (expiryDate < currentDate) {
    return { 
      isValid: false, 
      expiryDate: matchingCode.expiryDate,
      description: matchingCode.description,
      error: 'Access code has expired'
    };
  }
  
  // Valid code with expiry date
  return { 
    isValid: true, 
    expiryDate: matchingCode.expiryDate,
    description: matchingCode.description
  };
};

/**
 * Saves the authenticated state to local storage
 * @param {string} expiryDate - ISO date string for when the access expires
 * @param {string} description - Optional description of the access
 */
export const saveAuthState = (expiryDate, description = null) => {
  localStorage.setItem('uaExpandedSaverAuth', JSON.stringify({
    expiry: expiryDate,
    description,
    timestamp: new Date().toISOString()
  }));
};

export default {
  fetchAccessCodes,
  validateAccessCode,
  saveAuthState
}; 