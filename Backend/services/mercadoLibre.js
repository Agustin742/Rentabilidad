const axios = require('axios');

const API_BASE_URL = 'https://api.mercadolibre.com';

// Importar el objeto de tokens desde la ruta
const mercadoLibreTokens = require('../mlTokenStore');
const MLToken = require('../models/MLToken');
async function getMercadoLibreTokens() {
  try {
    console.log('[ML] Entrando a getMercadoLibreTokens');
    // Cargar desde memoria o DB
    let dbToken = null;
    if (mercadoLibreTokens.access_token) {
      dbToken = mercadoLibreTokens;
      console.log('[ML] Token en memoria:', {
        access_token: dbToken.access_token,
        expires_in: dbToken.expires_in,
        obtained_at: dbToken.obtained_at
      });
    } else {
      dbToken = await MLToken.findOne({});
      if (dbToken && dbToken.access_token) {
        mercadoLibreTokens.access_token = dbToken.access_token;
        mercadoLibreTokens.refresh_token = dbToken.refresh_token;
        mercadoLibreTokens.expires_in = dbToken.expires_in;
        mercadoLibreTokens.obtained_at = dbToken.obtained_at;
        mercadoLibreTokens.user_id = dbToken.user_id;
        mercadoLibreTokens.scope = dbToken.scope;
        console.log('[ML] Token cargado de MongoDB:', {
          access_token: dbToken.access_token,
          expires_in: dbToken.expires_in,
          obtained_at: dbToken.obtained_at
        });
      } else {
        console.log('[ML] No se encontró token en memoria ni en MongoDB');
      }
    }

    // Si no hay token, retorna nulo
    if (!dbToken || !dbToken.access_token) {
      console.log('[ML] No hay access_token disponible');
      return { access_token: null };
    }

    // Verifica expiración
    const expires_in = dbToken.expires_in || 0;
    const obtained_at = dbToken.obtained_at || 0;
    const expiresAt = obtained_at + (expires_in * 1000) - (60 * 1000); // 1 min de margen
    if (Date.now() >= expiresAt) {
      // Token expiró, intenta refresh
      console.log('[ML] Token expirado, intentando refresh...');
      try {
        const params = new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: process.env.ML_APP_ID,
          client_secret: process.env.ML_SECRET_KEY,
          refresh_token: dbToken.refresh_token,
          redirect_uri: process.env.ML_REDIRECT_URI
        });
        const response = await axios.post('https://api.mercadolibre.com/oauth/token', params.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        // Actualiza memoria y DB
        mercadoLibreTokens.access_token = response.data.access_token;
        mercadoLibreTokens.refresh_token = response.data.refresh_token;
        mercadoLibreTokens.expires_in = response.data.expires_in;
        mercadoLibreTokens.obtained_at = Date.now();
        mercadoLibreTokens.user_id = response.data.user_id;
        mercadoLibreTokens.scope = response.data.scope;
        await MLToken.findOneAndUpdate(
          {},
          {
            access_token: response.data.access_token,
            refresh_token: response.data.refresh_token,
            expires_in: response.data.expires_in,
            obtained_at: Date.now(),
            user_id: response.data.user_id,
            scope: response.data.scope
          },
          { upsert: true, new: true }
        );
        console.log('[ML] Token refrescado exitosamente:', {
          access_token: response.data.access_token,
          expires_in: response.data.expires_in,
          obtained_at: Date.now()
        });
        return mercadoLibreTokens;
      } catch (error) {
        console.error('[ML] Error refrescando access_token ML:', error.response?.data || error.message);
        return { access_token: null };
      }
    }

    // Si no expiró, retorna el token actual
    console.log('[ML] Token válido, retornando:', {
      access_token: mercadoLibreTokens.access_token,
      expires_in: mercadoLibreTokens.expires_in,
      obtained_at: mercadoLibreTokens.obtained_at
    });
    return mercadoLibreTokens;
  } catch (err) {
    console.error('[ML] Error inesperado en getMercadoLibreTokens:', err);
    return { access_token: null };
  }
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
  const { access_token: token } = await getMercadoLibreTokens();
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