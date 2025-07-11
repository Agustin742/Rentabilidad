const mongoose = require('mongoose');

const MLTokenSchema = new mongoose.Schema({
  access_token: String,
  refresh_token: String,
  expires_in: Number,
  obtained_at: Number,
  user_id: Number,
  scope: String
});

// Solo se usará un documento, así que no necesitamos timestamps ni índices especiales

module.exports = mongoose.model('MLToken', MLTokenSchema);
