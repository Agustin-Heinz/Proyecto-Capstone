require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Montaje de rutas modulares
app.use('/api', require('./routes/catalogo'));
app.use('/api/pacientes', require('./routes/pacientes'));
app.use('/api/fonoaudiologos', require('./routes/fonoaudiologos'));
app.use('/api/servicios', require('./routes/servicios'));
app.use('/api/disponibilidad', require('./routes/disponibilidad'));
app.use('/api/citas', require('./routes/citas'));
app.use('/api/fichas', require('./routes/fichas'));
app.use('/api/resenas', require('./routes/resenas'));
app.use('/api', require('./routes/auth'));
app.use('/api/estadisticas', require('./routes/estadisticas'));
app.use('/api/pagos', require('./routes/pagos'));
app.use('/api/chat', require('./routes/chat'));

// Arrancar el server
app.listen(PORT, () => {
  console.log(` Servidor FonoTrack corriendo perfectamente en http://localhost:${PORT}`);
});
