import { MercadoLibre } from 'mercadolibre';
import { get } from 'axios';

// Configuración del cliente
const client = new MercadoLibre({
  client_id: process.env.ML_APP_ID,
  client_secret: process.env.ML_SECRET_KEY,
});

async function searchProducts(query) {
  try {
    // Primero obtenemos un token de acceso
    const authData = await client.authorize({
      grant_type: 'client_credentials'
    });

    // Usamos el token para buscar productos
    const response = await get('https://api.mercadolibre.com/sites/MLA/search', {
      params: {
        q: encodeURIComponent(query),
        limit: 5
      },
      headers: {
        'Authorization': `Bearer ${authData.access_token}`
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
    
    // Fallback a búsqueda pública si falla la autenticación
    return publicSearch(query);
  }
}

async function publicSearch(query) {
  try {
    console.log('Usando búsqueda pública como fallback');
    const response = await get('https://api.mercadolibre.com/sites/MLA/search', {
      params: {
        q: encodeURIComponent(query),
        limit: 5
      }
    });
    
    return response.data.results.map(item => ({
      title: item.title,
      price: item.price,
      condition: item.condition
    }));
    
  } catch (error) {
    console.error('Error en búsqueda pública:', error.message);
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

export default { getPML };