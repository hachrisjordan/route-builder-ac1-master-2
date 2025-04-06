/**
 * Airline sources with their frequent flyer programs and codes
 * @typedef {Object} AirlineSource
 * @property {string} airline - Full airline name
 * @property {string} ffname - Frequent flyer program name
 * @property {string} iata - Airline IATA code
 * @property {string} codename - Program codename (used in API calls)
 */

/** @type {AirlineSource[]} */
export const sources = [
    {
        airline: 'Aeromexico',
        ffname: 'Club Premier',
        iata: 'AM',
        codename: 'aeromexico'
    },
    {
    airline: 'Air Canada',
    ffname: 'Aeroplan',
    iata: 'AC',
    codename: 'aeroplan'
  },
  {
    airline: 'Air France / KLM',
    ffname: 'Flying Blue',
    iata: 'AF',
    codename: 'flyingblue'
  },
  {
    airline: 'Alaska',
    ffname: 'Mileage Plan',
    iata: 'AS',
    codename: 'alaska'
  },
  {
    airline: 'American Airlines',
    ffname: 'AAdvantage',
    iata: 'AA',
    codename: 'american'
  },
  {
    airline: 'Azul',
    ffname: 'TudoAzul',
    iata: 'AD',
    codename: 'azul'
  },
  {
    airline: 'Copa Airlines',
    ffname: 'ConnectMiles',
    iata: 'CM',
    codename: 'copa'
  },
  {
    airline: 'Delta',
    ffname: 'SkyMiles',
    iata: 'DL',
    codename: 'delta'
  },
  {
    airline: 'Emirates',
    ffname: 'Skywards',
    iata: 'EK',
    codename: 'skywards'
  },
  {
    airline: 'Etihad',
    ffname: 'Guest',
    iata: 'EY',
    codename: 'etihad'
  },
  {
    airline: 'GOL',
    ffname: 'Smiles',
    iata: 'G3',
    codename: 'smiles'
  },
  {
    airline: 'JetBlue',
    ffname: 'TrueBlue',
    iata: 'B6',
    codename: 'jetblue'
  },
  {
    airline: 'Lufthansa',
    ffname: 'Miles & More',
    iata: 'LH',
    codename: 'lufthansa'
  },
  {
    airline: 'Qantas',
    ffname: 'Frequent Flyer',
    iata: 'QF',
    codename: 'qantas'
  },
  {
    airline: 'Qatar Airways',
    ffname: 'Privilege Club',
    iata: 'QR',
    codename: 'qatar'
  },
  {
    airline: 'SAS',
    ffname: 'EuroBonus',
    iata: 'SK',
    codename: 'eurobonus'
  },
  {
    airline: 'Singapore Airlines',
    ffname: 'KrisFlyer',
    iata: 'SQ',
    codename: 'singapore'
  },
  {
    airline: 'Turkish Airlines',
    ffname: 'Miles & Smiles',
    iata: 'TK',
    codename: 'turkish'
  },
  {
    airline: 'United',
    ffname: 'MileagePlus',
    iata: 'UA',
    codename: 'united'
  },
  {
    airline: 'Virgin Atlantic',
    ffname: 'Flying Club',
    iata: 'VS',
    codename: 'virginatlantic'
  },
  {
    airline: 'Virgin Australia',
    ffname: 'Velocity',
    iata: 'VA',
    codename: 'velocity'
  },
  
  
];

/**
 * Get source by its codename
 * @param {string} codename - The program codename to look up
 * @returns {AirlineSource | undefined}
 */
export const getSourceByCodename = (codename) => {
  return sources.find(source => source.codename === codename);
};

/**
 * Get source by airline IATA code
 * @param {string} iata - The airline IATA code to look up
 * @returns {AirlineSource | undefined}
 */
export const getSourceByIata = (iata) => {
  return sources.find(source => source.iata === iata);
};

/**
 * Get all available source codenams
 * @returns {string[]}
 */
export const getSourceCodenames = () => {
  return sources.map(source => source.codename);
};

/**
 * Get formatted label for a source
 * @param {AirlineSource} source
 * @returns {string}
 */
export const getSourceLabel = (source) => {
  return `${source.airline} (${source.ffname})`;
};

export default sources; 