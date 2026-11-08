const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// POST PARA EL CHATBOT

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const ESPECIALIDADES_FONOTRACK = [
  "Lactancia y frenillo lingual",
  "Deglución infantil",
  "Rehabilitación post ACV",
  "Deglución (disfagia)",
  "Voz",
  "Tartamudez",
  "Espectro autista (TEA)",
  "Lenguaje infantil",
  "Motricidad orofacial"
];

router.post('/', async (req, res) => {
  try {
    const { mensaje } = req.body;
    const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });

    // Prompt estricto que limita la IA a las especialidades del proyecto
    const promptContexto = `Eres un asistente de derivación médica virtual para la plataforma FonoTrack.
    Tu único objetivo es leer los síntomas o problemas del paciente y recomendarle a cuál de las siguientes subespecialidades fonoaudiológicas debe acudir:
    ('Evaluación del lenguaje infantil', 'Infantil'),
    ('Terapia de Trastorno del Espectro Autista (TEA)', 'Infantil'),
    ('Evaluación y terapia de frenillo lingual', 'Infantil'),
    ('Terapia de motricidad orofacial infantil', 'Infantil'),
    ('Terapia de habla y articulación (Dislalia)', 'Infantil'),
    ('Evaluación y rehabilitación vocal (Voz)', 'Adultos'),
    ('Rehabilitación cognitiva y lenguaje post ACV', 'Adultos'),
    ('Evaluación y terapia de deglución (Disfagia)', 'Adultos'),
    ('Rehabilitación auditiva y vestibular', 'Adultos'),
    ('Terapia de fluidez verbal (Adultos)', 'Adultos'),
    ('Lavado de oídos infantil (Extracción de cerumen)', 'Infantil'),
    ('Lavado de oídos adultos (Extracción de cerumen)', 'Adultos');

    REGLAS ESTRICTAS:
    1. Bajo ninguna circunstancia entregues un diagnóstico médico.
    2. Sé muy empático, claro y breve (máximo 3 o 4 líneas de respuesta).
    3. Termina tu respuesta indicando explícitamente el nombre de la subespecialidad de la lista anterior que mejor se ajuste.
    
    Síntomas del paciente: "${mensaje}"`;

    const result = await model.generateContent(promptContexto);
    const respuestaIA = result.response.text();

    const subespecialidadSugerida = ESPECIALIDADES_FONOTRACK.find(esp =>
      respuestaIA.toLowerCase().includes(esp.toLowerCase())
    ) || null;

    res.status(200).json({
      respuesta: respuestaIA,
      subespecialidad: subespecialidadSugerida
    });

  } catch (error) {
    console.error("Error en el chatbot:", error);
    res.status(500).json({ error: "No se pudo procesar la consulta clínica." });
  }
});

module.exports = router;

