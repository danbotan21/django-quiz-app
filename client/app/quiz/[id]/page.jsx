'use client'
import axios from 'axios'
import { useState, useEffect } from 'react'
import '../../../public/styles/quizPage.css'

const TestPages = ({ params }) => {
  const id = params.id

  const [quiz, setQuiz] = useState(null)
  const [questions, setQuestions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [timeQuiz, setTimeQuiz] = useState(null)
  const [minutes, setMinutes] = useState('00')
  const [seconds, setSeconds] = useState('00')

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [answerChecked, setAnswerChecked] = useState(null)
  const [userAnswer, setUserAnswer] = useState([])
  const [correctCount, setCorrectCount] = useState(0)

  const questionsLength = questions?.length
  const currentQuestion = questions?.[currentQuestionIndex]
  const percentageScore = questions
    ? Math.floor((correctCount / questions.length) * 100)
    : 0

  // ================= FETCH =================

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [quizRes, questionsRes] = await Promise.all([
          axios.get('http://localhost:8000/quiz/', { params: { id } }),
          axios.get('http://localhost:8000/questions/', { params: { id } }),
        ])

        setQuiz(quizRes.data)
        setQuestions(questionsRes.data)
        setTimeQuiz(quizRes.data.time * 60) // Convert minutes to seconds
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Failed to load quiz. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  // ================= TIMER =================

  useEffect(() => {
    if (timeQuiz === null || timeQuiz <= 0) return

    const interval = setInterval(() => {
      setTimeQuiz((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [timeQuiz])

  useEffect(() => {
    if (timeQuiz === null) return
    const min = Math.floor(timeQuiz / 60)
    const sec = timeQuiz % 60
    setMinutes(String(min).padStart(2, '0'))
    setSeconds(String(sec).padStart(2, '0'))
  }, [timeQuiz])

  // ================= HANDLERS =================

  const handleAnswerSelection = (event, index) => {
    event.preventDefault()
    setAnswerChecked(index)
    setSelectedAnswer(event.target.value)
  }

  const handleNextQuestion = (event) => {
    event.preventDefault()

    if (selectedAnswer === null) return

    // Check if answer is correct
    if (currentQuestion.correctAnswer === selectedAnswer) {
      setCorrectCount((prev) => prev + 1)
    }

    setUserAnswer((prev) => [...prev, selectedAnswer])
    setSelectedAnswer(null)
    setAnswerChecked(null)
    setCurrentQuestionIndex((prev) => prev + 1)
  }

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1)
      setSelectedAnswer(userAnswer[currentQuestionIndex - 1] || null)

      // Find the index of the selected answer
      if (userAnswer[currentQuestionIndex - 1]) {
        const answerIndex = currentQuestion.answers.findIndex(
          (a) => a.text === userAnswer[currentQuestionIndex - 1],
        )
        setAnswerChecked(answerIndex)
      }
    }
  }

  // ================= RENDER =================

  const quizFinished = timeQuiz === 0 || currentQuestionIndex >= questionsLength

  if (loading) {
    return (
      <div className='flex justify-center items-center h-screen'>
        <p className='text-2xl'>Loading quiz...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex justify-center items-center h-screen'>
        <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded'>
          <p>{error}</p>
          <a href='/' className='text-blue-600 hover:underline mt-4 block'>
            Back to Home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div>
      <a href='/' className='home-link'>
        <i className='fa-solid fa-house home'></i>
      </a>

      {!quizFinished && currentQuestion ? (
        <div className='quiz-question-parent'>
          <div className='question-control'>
            <button
              className='go-prv-question'
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
            >
              <i className='fa-solid fa-arrow-left'></i>
              Previous
            </button>

            <span className='question-num'>
              {currentQuestionIndex + 1}/{questionsLength}
            </span>

            <span
              className={`quiz-time ${timeQuiz < 60 ? 'text-red-600' : ''}`}
            >
              {minutes}:{seconds}
            </span>
          </div>

          <div className='quiz-question-display'>
            <p className='question'>{currentQuestion.questionQuiz}</p>
          </div>

          <div className='quiz-answers-display'>
            <form>
              <ul>
                {currentQuestion.answers.map((answer, index) => (
                  <li
                    key={answer.id}
                    className={`answer ${
                      answerChecked === index ? 'active' : ''
                    }`}
                  >
                    <label htmlFor={`a${answer.id}`}>{answer.text}</label>
                    <input
                      type='radio'
                      id={`a${answer.id}`}
                      name='answer'
                      value={answer.text}
                      checked={answerChecked === index}
                      onClick={(e) => handleAnswerSelection(e, index)}
                    />
                  </li>
                ))}
              </ul>

              <button
                className='btn'
                onClick={handleNextQuestion}
                disabled={selectedAnswer === null}
              >
                {currentQuestionIndex === questionsLength - 1
                  ? 'Finish'
                  : 'Next'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className='page-results'>
          <h1>{quiz?.titleQuiz} Quiz - Results</h1>

          <div className='result-summary'>
            <p className='result-score'>
              You answered <strong>{percentageScore}%</strong> correctly
            </p>
            {percentageScore >= quiz?.scoreToPass ? (
              <span className='pass'> ✓ PASSED</span>
            ) : (
              <span className='failed'> ✗ FAILED</span>
            )}
          </div>

          <div className='results-details'>
            {questions?.map((q, i) => (
              <div key={q.id} className='result-item'>
                <p className='result-question'>
                  Question {i + 1}: {q.questionQuiz}
                </p>

                <p
                  className={
                    userAnswer[i] === q.correctAnswer
                      ? 'correct-answer'
                      : 'incorrect-answer'
                  }
                >
                  {userAnswer[i]
                    ? `Your answer: ${userAnswer[i]}`
                    : 'No answer'}
                </p>

                {userAnswer[i] !== q.correctAnswer && (
                  <p className='correct-answer'>
                    Correct answer: {q.correctAnswer}
                  </p>
                )}
              </div>
            ))}
          </div>

          <a href='/' className='back-home-btn'>
            Back to Home
          </a>
        </div>
      )}
    </div>
  )
}

export default TestPages
