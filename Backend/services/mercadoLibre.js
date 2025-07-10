const axios = require('axios');
const qs = require('querystring');
const crypto = require('crypto'); // Añadir este módulo

const API_BASE_URL = 'https://api.mercadolibre.com';
let accessToken = null;

async function getAccessToken() {
  if (accessToken) return accessToken;
  
  // Verificar que tenemos el code_verifier
  if (!process.env.ML_CODE_VERIFIER) {
    throw new Error('Falta el code_verifier en variables de entorno');
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
        code_verifier: process.env.ML_CODE_VERIFIER // Parámetro nuevo REQUERIDO
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
    console.error('Error obteniendo token:', error.response?.data || error.message);
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
        'Authorization': `Bearer ${token}` // Solo este header es necesario
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
    return products.length ? Math.min(...products.map(p => p.price)) : null;
  } catch (error) {
    console.error('Error calculando PML:', error.message);
    return null;
  }
}

module.exports = { getPML };