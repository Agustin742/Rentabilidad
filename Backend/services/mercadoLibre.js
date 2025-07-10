const axios = require('axios');
const qs = require('querystring');
const crypto = require('crypto');

const API_BASE_URL = 'https://api.mercadolibre.com';
let accessToken = null;

// Función para generar PKCE code_verifier y challenge
function generatePKCE() {
  const codeVerifier = crypto.randomBytes(64).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
    .slice(0, 128);

  const codeChallenge = crypto.createHash('sha256')
    .update(codeVerifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return { codeVerifier, codeChallenge };
}

async function getAccessToken() {
  if (accessToken) return accessToken;
  
  // Verificar que tenemos el code_verifier
  if (!process.env.ML_CODE_VERIFIER) {
    throw new Error('Falta el code_verifier de PKCE en las variables de entorno');
  }

  try {
    const response = await axios.post(
      `${API_BASE_URL}/oauth/token`,
      qs.stringify({
        grant_type: 'authorization_code',
        client_id: process.env.ML_APP_ID,
        client_secret: process.env.ML_SECRET_KEY,
        code: process.env.ML_AUTH_CODE,
        redirect_uri: process.env.ML_REDIRECT_URI,
        code_verifier: process.env.ML_CODE_VERIFIER  // Añadido PKCE
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      }
    );
    
    accessToken = response.data.access_token;
    return accessToken;
    
  } catch (error) {
    console.error('Error obteniendo token:', {
      status: error.response?.status,
      data: error.response?.data,
      config: error.config
    });
    throw new Error('Error de autenticación con Mercado Libre');
  }
}

async function searchProducts(query) {
  try {
    const token = await getAccessToken();
    
    const response = await axios.get(`${API_BASE_URL}/sites/MLA/search`, {
      params: {
        q: encodeURIComponent(query),
        limit: 5
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        // Eliminados headers redundantes
      }
    });
    
    return response.data.results.map(item => ({
      title: item.title,
      price: item.price,
      condition: item.condition
    }));
    
  } catch (error) {
    console.error('Error en búsqueda:', error.response?.data || error.message);
    return [];
  }
}
async function getPML(productName) {
  try {
    const products = await searchProducts(productName);
    if (!products.length) return null;
    
    return Math.min(...products.map(p => p.price));
    
  } catch (error) {
    console.error('Error calculando PML:', error.message);
    return null;
  }
}

module.exports = { getPML };