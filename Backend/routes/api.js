const express = require('express');
const router = express.Router();
const { calculatePrice } = require('../services/pricing');
const Calculation = require('../models/Calculation');
const axios = require('axios');

// ====== Mercado Libre OAuth (admin) ======
let mercadoLibreTokens = {
  access_token: null,
  refresh_token: null,
  expires_in: null,
  obtained_at: null
};

const ML_APP_ID = process.env.ML_APP_ID;
const ML_SECRET_KEY = process.env.ML_SECRET_KEY;
const ML_REDIRECT_URI = process.env.ML_REDIRECT_URI || 'https://rentabilidad-arg.netlify.app/';

// Endpoint para obtener la URL de autenticación de Mercado Libre
router.get('/mercadolibre/auth-url', (req, res) => {
  // Soportar PKCE (opcional)
  const { code_challenge } = req.query;
  let url = `https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=${ML_APP_ID}&redirect_uri=${encodeURIComponent(ML_REDIRECT_URI)}`;
  if (code_challenge) {
    url += `&code_challenge=${code_challenge}&code_challenge_method=S256`;
  }
  res.json({ url });
});

// Endpoint para recibir el code y obtener el access_token
router.post('/mercadolibre/callback', async (req, res) => {
  const { code, code_verifier } = req.body;
  if (!code) return res.status(400).json({ error: 'Falta el code' });

  try {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: ML_APP_ID,
      client_secret: ML_SECRET_KEY,
      code,
      redirect_uri: ML_REDIRECT_URI
    });
    // Incluir code_verifier si viene del frontend (PKCE)
    if (code_verifier) {
      params.append('code_verifier', code_verifier);
    }

    const response = await axios.post('https://api.mercadolibre.com/oauth/token', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    mercadoLibreTokens = {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_in: response.data.expires_in,
      obtained_at: Date.now()
    };

    res.json({ success: true, tokens: mercadoLibreTokens });
  } catch (error) {
    console.error('Error intercambiando code por token:', error.response?.data || error.message);
    res.status(500).json({ error: 'No se pudo obtener el access_token', details: error.response?.data || error.message });
  }
});

// Ruta para cálculo de rentabilidad
router.post('/calculate', async (req, res) => {
  try {
    const { productName, cost, shippingCost = 0, quantity, costType } = req.body;
    
    // Validación básica
    if (!productName || cost === undefined || quantity === undefined || costType === undefined) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }
    
    // Calcular precio
    const result = await calculatePrice(
      productName, 
      parseFloat(cost), 
      parseFloat(shippingCost), 
      parseInt(quantity), 
      costType
    );
    
    // Guardar en base de datos
    const newCalculation = new Calculation({
      productName: result.productName,
      costPerUnit: result.unitCost,
      shippingCost: result.shippingCost,
      suggestedPrice: result.suggestedPrice,
      minSellingPrice: result.minSellingPrice,
      pml: result.pml,
      markup: result.minMarkup,
      margin: result.requiredMargin,
      viable: result.viable
    });
    
    await newCalculation.save();
    
    // Devolver resultados
    res.json({
      ...result,
      calculationId: newCalculation._id
    });
    
  } catch (error) {
    console.error('Error en cálculo:', error);
    if (error.message && error.message.toLowerCase().includes('access_token')) {
      return res.status(401).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// Ruta para obtener historial de cálculos
router.get('/history', async (req, res) => {
  try {
    const history = await Calculation.find()
      .sort({ createdAt: -1 })
      .limit(10);
    
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo historial' });
  }
});

module.exports = router;
module.exports.mercadoLibreTokens = mercadoLibreTokens;