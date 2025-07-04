const { getPML } = require('./mercadoLibre');

// Constantes
const TAX_RATE = 0.21;        // 21% impuestos
const PLATFORM_FEE = 0.13;    // 13% comisión plataforma
const MARKETING_FEE = 0.10;   // 10% marketing
const MIN_PROFIT_MARGIN = 0.05; // 5% margen de ganancia mínimo

// Calcular precio según documento de pricing
async function calculatePrice(productName, cost, shippingCost, quantity, costType) {
  // Calcular costo unitario
  const unitCost = costType === 'unidad' ? cost : cost / quantity;
  
  // Obtener PML (Precio Mercado Libre)
  const pml = await getPML(productName);
  
  // Calcular margen total requerido (impuestos + comisiones + marketing + ganancia)
  const requiredMargin = TAX_RATE + PLATFORM_FEE + MARKETING_FEE + MIN_PROFIT_MARGIN;
  
  // Calcular markup mínimo según documento
  const minMarkup = requiredMargin / (1 - requiredMargin);
  
  // Calcular precio mínimo de venta
  const minSellingPrice = (unitCost * (1 + minMarkup)) + shippingCost;
  
  // Verificar viabilidad
  const viable = pml ? minSellingPrice <= pml : true;
  
  // Calcular precio sugerido
  let suggestedPrice;
  if (pml) {
    // Si hay competencia: 95% del PML
    suggestedPrice = pml * 0.95;
  } else {
    // Sin competencia: usar precio mínimo
    suggestedPrice = minSellingPrice;
  }
  
  // Calcular desglose
  const breakdown = {
    taxes: suggestedPrice * TAX_RATE,
    platformFee: suggestedPrice * PLATFORM_FEE,
    marketing: suggestedPrice * MARKETING_FEE,
    profit: suggestedPrice * MIN_PROFIT_MARGIN,
    shipping: shippingCost
  };
  
  return {
    productName,
    unitCost,
    shippingCost,
    pml,
    minMarkup,
    minSellingPrice,
    requiredMargin,
    viable,
    suggestedPrice,
    breakdown
  };
}

module.exports = { calculatePrice };