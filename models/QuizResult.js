import mongoose from 'mongoose';

const QuizResultSchema = new mongoose.Schema({
  name: { type: String, required: true },
  questions: [
    {
      question: String,
      correctAnswer: String,
      userAnswer: String,
      isCorrect: Boolean
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('QuizResult', QuizResultSchema);