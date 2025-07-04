require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT || 5000;

// Configuración CORS para producción
const allowedOrigins = [
  'https://rentabilidad-arg.netlify.app', // Tu dominio Netlify
  'http://localhost:3000' // Desarrollo
];

const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado por CORS'));
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));  // ¡Reemplaza app.use(cors())!
app.use(express.json());

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Conectado a MongoDB'))
.catch(err => console.error('❌ Error de conexión a MongoDB:', err));

// Ruta de verificación
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'active',
    message: 'Backend funcionando',
    timestamp: new Date().toISOString()
  });
});

// Rutas principales
const apiRouter = require('./routes/api');
app.use('/api', apiRouter);

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(port, () => {
  console.log(`🚀 Servidor backend en http://localhost:${port}`);
});
