require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const corsOptions = {
  origin: [
    'https://[TU-FRONTEND-EN-NETLIFY].netlify.app', // Reemplaza con tu dominio real
    'http://localhost:3000' // Para desarrollo local
  ],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
};



const app = express();
const port = process.env.PORT || 5000;

// Middlewares
app.use(cors(corsOptions));  // Usa las opciones configuradas
app.use(express.json());

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Conectado a MongoDB'))
.catch(err => console.error('❌ Error de conexión a MongoDB:', err));

// Rutas
const apiRouter = require('./routes/api');
app.use('/api', apiRouter);

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.get('/wake-up', (req, res) => {
  res.send('¡Backend activado!');
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${port}`);
});