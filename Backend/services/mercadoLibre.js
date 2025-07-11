const axios = require('axios');

const API_BASE_URL = 'https://api.mercadolibre.com';

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
  try {
    // Primero intentamos con autenticación
    const token = await getAccessToken();
    
    if (token) {
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
    }
    
    // Si falla el token, intentamos sin autenticación
    return publicSearch(query);
    
  } catch (error) {
    console.error('Error en búsqueda con token:', {
      status: error.response?.status,
      data: error.response?.data
    });
    return publicSearch(query);
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
    console.error('Error calculando PML:', error.message);
    return null;
  }
}

module.exports = { getPML };