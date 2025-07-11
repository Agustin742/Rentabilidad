const axios = require('axios');

const API_BASE_URL = 'https://api.mercadolibre.com';

// Importar el objeto de tokens desde la ruta
const mercadoLibreTokens = require('../mlTokenStore');
function getMercadoLibreTokens() {
  return mercadoLibreTokens;
}

async function getAccessToken() {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/oauth/token`,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.ML_APP_ID,
        client_secret: process.env.ML_SECRET_KEY
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 5000
      }
    );
    
    return response.data.access_token;
  } catch (error) {
    console.error('Error obteniendo token con client credentials:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    return null;
  }
}

async function searchProducts(query) {
  // Usar el access_token OAuth guardado en memoria
  const token = getMercadoLibreTokens().access_token;
  console.log('TOKEN ACTUAL:', token);
  if (!token) {
    throw new Error('No hay access_token de Mercado Libre. Debe autenticarse el administrador.');
  }
  try {
    const response = await axios.get(`${API_BASE_URL}/sites/MLA/search`, {
      params: {
        q: encodeURIComponent(query),
        limit: 5
      },
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 5000
    });
    return response.data.results.map(item => ({
      title: item.title,
      price: item.price,
      condition: item.condition
    }));
  } catch (error) {
    console.error('Error en búsqueda con token OAuth:', {
      status: error.response?.status,
      data: error.response?.data
    });
    throw new Error('Error en búsqueda autenticada. Puede requerir reautenticación.');
  }
}

async function publicSearch(query) {
  try {
    console.log('Usando búsqueda pública');
    const response = await axios.get(`${API_BASE_URL}/sites/MLA/search`, {
      params: {
        q: encodeURIComponent(query),
        limit: 5
      },
      timeout: 5000
    });
    
    return response.data.results.map(item => ({
      title: item.title,
      price: item.price,
      condition: item.condition
    }));
    
  } catch (error) {
    console.error('Error en búsqueda pública:', {
      status: error.response?.status,
      data: error.response?.data
    });
    return [];
  }
}

async function getPML(productName) {
  try {
    const products = await searchProducts(productName);
    return products.length ? Math.min(...products.map(p => p.price)) : null;
  } catch (error) {
    // Si el error es por falta de access_token, relanzar para que el endpoint devuelva 401
    if (error.message && error.message.toLowerCase().includes('access_token')) {
      throw error;
    }
    console.error('Error calculando PML:', error.message);
    return null;
  }
}

module.exports = { getPML };