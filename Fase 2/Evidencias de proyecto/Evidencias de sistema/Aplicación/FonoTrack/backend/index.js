require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { iniciarWhatsApp, enviarRecordatoriosManana } = require('./config/whatsapp');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => res.send('API de FonoTrack funcionando correctamente'));

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

// Endpoint para disparar manualmente los recordatorios de las citas de mañana
app.post('/api/recordatorios/enviar-manana', async (req, res) => {
  const resultado = await enviarRecordatoriosManana();
  res.status(200).json(resultado);
});

// Inicializar cliente de WhatsApp Web y programador diario de recordatorios
iniciarWhatsApp();

app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
