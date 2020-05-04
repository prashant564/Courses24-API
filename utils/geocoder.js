const NodeGeooder = require('node-geocoder');

const options = {
  provider: process.env.GEOCODER_PROVIDER,
  httpAdapter: 'https',
  apiKey: process.env.GEOCODER_API_KEY,
  formatter: null,
};

const geocoder = NodeGeooder(options);

module.exports = geocoder;
