const axios = require('axios');

// Configuración de la API
const API_BASE_URL = 'https://api.mercadolibre.com';

// Variables para almacenar token
let accessToken = '';
let tokenExpiration = 0;

// Obtener token de acceso
async function getAccessToken() {
  // Si el token sigue siendo válido, lo devolvemos
  if (accessToken && Date.now() < tokenExpiration) {
    return accessToken;
  }
  
  try {
    const response = await axios.post(`${API_BASE_URL}/oauth/token`, null, {
      params: {
        grant_type: 'client_credentials',
        client_id: process.env.ML_APP_ID,
        client_secret: process.env.ML_SECRET_KEY
      }
    });
    
    accessToken = response.data.access_token;
    tokenExpiration = Date.now() + (response.data.expires_in * 1000) - 60000; // 1 min de margen
    return accessToken;
    
  } catch (error) {
    console.error('Error obteniendo token de acceso:', error.response?.data || error.message);
    throw new Error('No se pudo conectar con Mercado Libre');
  }
}

// Buscar productos en Mercado Libre
async function searchProducts(query) {
  try {
    const token = await getAccessToken();
    
    const response = await axios.get(`${API_BASE_URL}/sites/MLA/search`, {
      params: {
        q: query,
        limit: 5,        // Solo los primeros 5 resultados
        sort: 'price_asc' // Ordenar por precio ascendente
      },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    // Filtrar productos relevantes (nuevos, con envío gratis)
    const relevantProducts = response.data.results.filter(
      product => product.condition === 'new' && product.shipping.free_shipping
    );
    
    // Procesar resultados
    return relevantProducts.map(item => ({
      id: item.id,
      title: item.title,
      price: item.price,
      currency_id: item.currency_id,
      condition: item.condition,
      permalink: item.permalink,
      thumbnail: item.thumbnail
    }));
    
  } catch (error) {
    console.error('Error buscando productos:', error.response?.data || error.message);
    throw new Error('Error al buscar productos en Mercado Libre');
  }
}

// Obtener PML (Precio Mercado Libre)
async function getPML(productName) {
  const products = await searchProducts(productName);
  
  if (products.length === 0) return null;
  
  // Obtener el precio más bajo entre los productos relevantes
  return Math.min(...products.map(p => p.price));
}

module.exports = {
  getPML,
  searchProducts
};