require('dotenv').config();
const path = require('path');

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  sessionSecret: process.env.SESSION_SECRET || 'courier_default_secret_key_2026',
  dbFile: process.env.DB_FILE ? path.resolve(__dirname, '../../', process.env.DB_FILE) : path.resolve(__dirname, '../../courier.db'),
  appName: 'Sistema Courier Pro',
  version: '1.0.0'
};
