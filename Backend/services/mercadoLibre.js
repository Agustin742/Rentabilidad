const axios = require('axios');

const API_BASE_URL = 'https://api.mercadolibre.com';

// Función mejorada para obtener el token
function getAccessToken() {
  // Verifica si existe la variable
  if (!process.env.ML_ACCESS_TOKEN) {
    console.error("ERROR CRÍTICO: ML_ACCESS_TOKEN no está definido en las variables de entorno");
    throw new Error('Token de acceso no configurado');
  }
  return process.env.ML_ACCESS_TOKEN;
}

async function searchProducts(query) {
  try {
    const token = getAccessToken();
    console.log("Token usado:", token.slice(0, 10) + "..."); // Log parcial del token
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const response = await axios.get(`${API_BASE_URL}/sites/MLA/search`, {
      params: {
        q: encodeURIComponent(query),
        limit: 5,
        sort: 'price_asc'
      },
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'RentabilidadApp/1.0'
      }
    });

    
    // Filtrar productos relevantes (nuevos)
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