const axios = require('axios');
const qs = require('querystring');

const API_BASE_URL = 'https://api.mercadolibre.com';
let accessToken = null;

async function getAccessToken() {
  if (accessToken) return accessToken;
  
  try {
    const response = await axios.post(
      `${API_BASE_URL}/oauth/token`,
      qs.stringify({
        grant_type: 'authorization_code',
        client_id: process.env.ML_APP_ID,
        client_secret: process.env.ML_SECRET_KEY,
        code: process.env.ML_AUTH_CODE,
        redirect_uri: process.env.ML_REDIRECT_URI
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
    console.log('Token obtenido correctamente');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const response = await axios.get(`${API_BASE_URL}/sites/MLA/search`, {
      params: {
        q: encodeURIComponent(query),
        limit: 5
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-app-id': process.env.ML_APP_ID,
        'x-app-secret': process.env.ML_SECRET_KEY
      }
    });
    
    return response.data.results.map(item => ({
      title: item.title,
      price: item.price,
      condition: item.condition
    }));
    
  } catch (error) {
    console.error('Error en búsqueda:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
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