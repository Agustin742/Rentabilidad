const express = require('express');
const router = express.Router();
const { calculatePrice } = require('../services/pricing');
const Calculation = require('../models/Calculation');

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