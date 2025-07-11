const axios = require('axios');
const qs = require('querystring');

const API_BASE_URL = 'https://api.mercadolibre.com';
let accessToken = null;

async function getAccessToken() {
  if (accessToken) {
    console.log('Usando token existente');
    return accessToken;
  }
  
  console.log('Obteniendo nuevo token...', {
    client_id: process.env.ML_APP_ID ? 'presente' : 'ausente',
    client_secret: process.env.ML_SECRET_KEY ? 'presente' : 'ausente',
    code: process.env.ML_AUTH_CODE ? 'presente' : 'ausente',
    redirect_uri: process.env.ML_REDIRECT_URI,
    code_verifier: process.env.ML_CODE_VERIFIER ? 'presente' : 'ausente'
  });

  try {
    const response = await axios.post(
      `${API_BASE_URL}/oauth/token`,
      qs.stringify({
        grant_type: 'authorization_code',
        client_id: process.env.ML_APP_ID,
        client_secret: process.env.ML_SECRET_KEY,
        code: process.env.ML_AUTH_CODE,
        redirect_uri: process.env.ML_REDIRECT_URI,
        code_verifier: process.env.ML_CODE_VERIFIER
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        timeout: 10000
      }
    );
    
    accessToken = response.data.access_token;
    console.log('Token obtenido exitosamente');
    return accessToken;
    
  } catch (error) {
    console.error('Error obteniendo token:', {
      status: error.response?.status,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data
      }
    });
    throw new Error(`Error de autenticación: ${error.response?.data?.error || error.message}`);
  }
}

async function searchProducts(query) {
  try {
    const token = await getAccessToken();
    const searchUrl = `${API_BASE_URL}/sites/MLA/search?q=${encodeURIComponent(query)}&limit=5`;
    
    console.log('Realizando búsqueda:', {
      url: searchUrl,
      headers: {
        Authorization: `Bearer ${token.substring(0, 15)}...` // Solo mostrar parte del token
      }
    });

    const response = await axios.get(searchUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 10000
    });
    
    console.log('Búsqueda exitosa. Resultados:', response.data.results.length);
    return response.data.results.map(item => ({
      title: item.title,
      price: item.price,
      condition: item.condition
    }));
    
  } catch (error) {
    console.error('Error en búsqueda:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: {
          Authorization: error.config?.headers?.Authorization 
            ? `${error.config.headers.Authorization.substring(0, 15)}...` 
            : 'Ausente'
        }
      }
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