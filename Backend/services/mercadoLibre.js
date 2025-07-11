const axios = require('axios');
const qs = require('querystring');

const API_BASE_URL = 'https://api.mercadolibre.com';
let accessToken = null;
let refreshToken = null;

async function getAccessToken() {
  if (accessToken) {
    console.log('Usando token existente');
    return accessToken;
  }
  
  // Intento de renovación con refresh token
  if (refreshToken) {
    console.log('Intentando renovar token con refresh token...');
    try {
      const response = await axios.post(
        `${API_BASE_URL}/oauth/token`,
        qs.stringify({
          grant_type: 'refresh_token',
          client_id: process.env.ML_APP_ID,
          client_secret: process.env.ML_SECRET_KEY,
          refresh_token: refreshToken
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
      refreshToken = response.data.refresh_token;
      console.log('Token renovado exitosamente con refresh token');
      console.log('Scopes del token:', response.data.scope); // Log de scopes
      return accessToken;
      
    } catch (refreshError) {
      console.warn('Error renovando token con refresh token:', {
        status: refreshError.response?.status,
        error: refreshError.response?.data?.error,
        message: refreshError.response?.data?.message
      });
    }
  }

  // Flujo normal con code_verifier
  console.log('Obteniendo nuevo token con código de autorización...');
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
    refreshToken = response.data.refresh_token;
    
    console.log('Token obtenido exitosamente. Refresh token almacenado.');
    console.log('Scopes del token:', response.data.scope); // Log de scopes
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
    const searchUrl = `${API_BASE_URL}/sites/MLA/search`;
    
    console.log('Realizando búsqueda:', {
      url: searchUrl,
      query: query,
      limit: 5
    });

    const response = await axios.get(searchUrl, {
      params: {
        q: encodeURIComponent(query),
        limit: 5
      },
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
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method
    });

    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.warn('Token inválido. Limpiando token para renovar...');
      accessToken = null;
      
      // Intentar una vez más después de limpiar el token
      if (error.response.status === 403) {
        console.warn('Reintentando búsqueda con nuevo token...');
        return searchProducts(query);
      }
    }

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