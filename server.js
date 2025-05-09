import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { router as chatRoutes } from './routes/chatRoutes.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import QuizResult from './models/QuizResult.js';

// Obtener el directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config();

// Verificar configuración de OpenAI
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ Error: Falta la variable OPENAI_API_KEY');
  process.exit(1); // Detener el servidor si falta la clave
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chat-gpt-app';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000
}).then(() => {
  console.log('✅ MongoDB conectado');
}).catch(err => {
  console.error('❌ Error de conexión a MongoDB:', err);
});

// OpenAI Configuration
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Rutas
app.use('/api/chat', chatRoutes);

app.post('/api/questions', async (req, res) => {
  const { topic } = req.body;

  if (!topic) {
    return res.status(400).json({ error: 'Por favor, proporciona un tema.' });
  }

  try {
    const prompt = `Genera 5 preguntas de opción múltiple sobre "${topic}". Para cada pregunta, da 1 respuesta correcta y 3 incorrectas. Formato JSON: [{"question":"...","correctAnswer":"...","incorrectAnswers":["...","...","..."]}]`;
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: "user", content: prompt }],
      max_tokens: 600,
      temperature: 0.7,
    });
    // Extraer JSON del texto de respuesta
    const match = completion.choices[0].message.content.match(/\[.*\]/s);
    const questions = match ? JSON.parse(match[0]) : [];

    res.json({ questions });
  } catch (error) {
    console.error('Error al generar preguntas:', error);
    res.status(500).json({ error: 'Hubo un problema al generar las preguntas.' });
  }
});

// Endpoint para guardar resultados
app.post('/api/quiz-result', async (req, res) => {
  try {
    const { name, questions } = req.body;
    const result = new QuizResult({ name, questions });
    await result.save();
    res.json({ message: 'Resultado guardado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al guardar el resultado' });
  }
});

// Ruta para probar el servidor
app.get('/', (req, res) => {
  res.json({ 
    message: 'API de ChatGPT funcionando correctamente',
    status: 'OpenAI configurado con clave fija en el controlador'
  });
});

// Agregar manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo salió mal!' });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});
