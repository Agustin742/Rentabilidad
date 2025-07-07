const axios = require('axios');

// Configuración de la API
const API_BASE_URL = 'https://api.mercadolibre.com';

// Obtener token de acceso desde variables de entorno
function getAccessToken() {
  const token = process.env.ML_ACCESS_TOKEN;
  if (!token) {
    throw new Error('Token de acceso a Mercado Libre no configurado');
  }
  return token;
}

// Buscar productos en Mercado Libre
async function searchProducts(query) {
  try {
    const token = getAccessToken();
    
    // Agregar retardo para evitar rate limits
    const delay = parseInt(process.env.ML_API_DELAY || 1500);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    const response = await axios.get(`${API_BASE_URL}/sites/MLA/search`, {
      params: {
        q: encodeURIComponent(query),
        limit: 5,
        sort: 'price_asc'
      },
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'RentabilidadApp/1.0 (agustintabarcache74@gmail.com)'
      }
    });
    
    // Filtrar productos relevantes
    const relevantProducts = response.data.results.filter(
      product => product.condition === 'new'
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
    console.error('Error detallado en búsqueda de productos:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    // Manejo específico de errores
    if (error.response?.status === 401) {
      throw new Error('Token de acceso inválido o expirado');
    } else if (error.response?.status === 403) {
      throw new Error('Acceso prohibido. Verifica tus credenciales');
    } else if (error.response?.status === 429) {
      throw new Error('Demasiadas solicitudes. Intenta de nuevo más tarde');
    } else {
      throw new Error('Error al buscar productos en Mercado Libre');
    }
  }
}

// Obtener PML (Precio Mercado Libre)
async function getPML(productName) {
  try {
    const products = await searchProducts(productName);
    
    if (products.length === 0) return null;
    
    // Calcular precio promedio (más confiable que el mínimo)
    const total = products.reduce((sum, product) => sum + product.price, 0);
    return total / products.length;
    
  } catch (error) {
    console.error('Error en getPML:', error.message);
    return null; // Devuelve null para que la app continúe sin PML
  }
}

module.exports = {
  getPML,
  searchProducts
};