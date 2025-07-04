const mongoose = require('mongoose');

const CalculationSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: true,
    trim: true
  },
  costPerUnit: {
    type: Number,
    required: true,
    min: 0
  },
  shippingCost: {
    type: Number,
    default: 0
  },
  suggestedPrice: {
    type: Number,
    required: true,
    min: 0
  },
  minSellingPrice: {
    type: Number,
    required: true
  },
  pml: Number,
  markup: Number,
  margin: Number,
  viable: {
    type: Boolean,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Calculation', CalculationSchema);