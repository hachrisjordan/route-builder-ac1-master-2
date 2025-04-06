// Import sources data
import sources from '../data/sources';

/**
 * Get source information by its codename
 * @param {string} codename - The source codename to look up
 * @returns {Object|null} The source object if found, null otherwise
 */
export const getSourceByCodename = (codename) => {
  if (!codename) return null;
  return sources.find(source => source.codename === codename) || null;
};

export default {
  getSourceByCodename
}; 