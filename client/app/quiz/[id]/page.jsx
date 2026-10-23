'use client'
import axios from 'axios'
import { useState, useEffect } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const HomeLink = () => (
  <a
    href='/'
    className='inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-indigo-600'
  >
    <i className='fa-solid fa-arrow-left'></i>
    All quizzes
  </a>
)

const TestPages = ({ params }) => {
  const id = params.id

  const [quiz, setQuiz] = useState(null)
  const [questions, setQuestions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [timeQuiz, setTimeQuiz] = useState(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  // userAnswers[i] = the answer text chosen for question i
  const [userAnswers, setUserAnswers] = useState([])

  const questionsLength = questions?.length || 0
  const currentQuestion = questions?.[currentQuestionIndex]
  const selectedAnswer = userAnswers[currentQuestionIndex]

  // ================= FETCH =================

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [quizRes, questionsRes] = await Promise.all([
          axios.get(`${API_URL}/quiz/`, { params: { id } }),
          axios.get(`${API_URL}/questions/`, { params: { id } }),
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

  const quizFinished =
    timeQuiz === 0 || (questions && currentQuestionIndex >= questionsLength)

  useEffect(() => {
    if (timeQuiz === null || timeQuiz <= 0 || quizFinished) return

    const timeout = setTimeout(() => setTimeQuiz((prev) => prev - 1), 1000)
    return () => clearTimeout(timeout)
  }, [timeQuiz, quizFinished])

  const minutes = String(Math.floor((timeQuiz || 0) / 60)).padStart(2, '0')
  const seconds = String((timeQuiz || 0) % 60).padStart(2, '0')

  // ================= HANDLERS =================

  const handleAnswerSelection = (answerText) => {
    setUserAnswers((prev) => {
      const next = [...prev]
      next[currentQuestionIndex] = answerText
      return next
    })
  }

  const handleNextQuestion = () => {
    if (selectedAnswer === undefined) return
    setCurrentQuestionIndex((prev) => prev + 1)
  }

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) setCurrentQuestionIndex((prev) => prev - 1)
  }

  // ================= RENDER =================

  if (loading) {
    return (
      <div className='flex h-screen items-center justify-center text-xl text-slate-500'>
        Loading quiz...
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <div className='rounded-xl border border-rose-200 bg-rose-50 px-6 py-4 text-rose-700'>
          <p>{error}</p>
          <div className='mt-3'>
            <HomeLink />
          </div>
        </div>
      </div>
    )
  }

  if (!quizFinished && currentQuestion) {
    const progress = (currentQuestionIndex / questionsLength) * 100
    const isLast = currentQuestionIndex === questionsLength - 1

    return (
      <main className='mx-auto max-w-3xl px-6 py-8'>
        <HomeLink />

        <div className='mt-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium text-indigo-600'>
                {quiz.titleQuiz}
              </p>
              <p className='text-sm text-slate-500'>
                Question {currentQuestionIndex + 1} of {questionsLength}
              </p>
            </div>
            <span
              className={`flex items-center gap-2 rounded-full px-4 py-2 font-mono text-lg font-semibold ${
                timeQuiz < 60
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              <i className='fa-regular fa-clock'></i>
              {minutes}:{seconds}
            </span>
          </div>

          <div className='mt-4 h-2 overflow-hidden rounded-full bg-slate-100'>
            <div
              className='h-full rounded-full bg-indigo-600 transition-all'
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <h1 className='mt-8 text-2xl font-bold text-slate-900'>
            {currentQuestion.questionQuiz}
          </h1>

          <ul className='mt-6 space-y-3'>
            {currentQuestion.answers.map((answer, index) => {
              const active = selectedAnswer === answer.text
              return (
                <li key={answer.id}>
                  <button
                    type='button'
                    onClick={() => handleAnswerSelection(answer.text)}
                    className={`flex w-full items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left font-medium transition ${
                      active
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                        : 'border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                        active
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {String.fromCharCode(65 + index)}
                    </span>
                    {answer.text}
                  </button>
                </li>
              )
            })}
          </ul>

          <div className='mt-8 flex items-center justify-between'>
            <button
              type='button'
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
              className='rounded-xl px-5 py-3 font-semibold text-slate-600 transition hover:bg-slate-100 disabled:invisible'
            >
              <i className='fa-solid fa-arrow-left mr-2'></i>
              Previous
            </button>
            <button
              type='button'
              onClick={handleNextQuestion}
              disabled={selectedAnswer === undefined}
              className='rounded-xl bg-indigo-600 px-8 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40'
            >
              {isLast ? 'Finish' : 'Next'}
              <i className='fa-solid fa-arrow-right ml-2'></i>
            </button>
          </div>
        </div>
      </main>
    )
  }

  const correctCount = questions.filter(
    (q, i) => userAnswers[i] === q.correctAnswer,
  ).length
  const percentageScore = Math.floor((correctCount / questionsLength) * 100)
  const passed = percentageScore >= quiz.scoreToPass

  return (
    <main className='mx-auto max-w-3xl px-6 py-8'>
      <HomeLink />

      <section className='mt-6 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm'>
        <p className='text-sm font-medium text-indigo-600'>
          {quiz.titleQuiz} · Results
        </p>
        <p
          className={`mt-4 text-6xl font-extrabold ${
            passed ? 'text-emerald-600' : 'text-rose-600'
          }`}
        >
          {percentageScore}%
        </p>
        <p className='mt-2 text-slate-500'>
          {correctCount} of {questionsLength} correct · {quiz.scoreToPass}%
          needed to pass
          {timeQuiz === 0 && ' · time ran out'}
        </p>
        <span
          className={`mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2 font-semibold ${
            passed
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-rose-100 text-rose-700'
          }`}
        >
          <i className={`fa-solid ${passed ? 'fa-check' : 'fa-xmark'}`}></i>
          {passed ? 'Passed' : 'Failed'}
        </span>
      </section>

      <ul className='mt-6 space-y-3'>
        {questions.map((q, i) => {
          const correct = userAnswers[i] === q.correctAnswer
          return (
            <li
              key={q.id}
              className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
            >
              <div className='flex items-start gap-3'>
                <i
                  className={`fa-solid mt-1 ${
                    correct
                      ? 'fa-circle-check text-emerald-500'
                      : 'fa-circle-xmark text-rose-500'
                  }`}
                ></i>
                <div>
                  <p className='font-semibold text-slate-900'>
                    {i + 1}. {q.questionQuiz}
                  </p>
                  <p
                    className={`mt-1 text-sm ${
                      correct ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {userAnswers[i] ? `Your answer: ${userAnswers[i]}` : 'No answer'}
                  </p>
                  {!correct && (
                    <p className='mt-1 text-sm text-emerald-700'>
                      Correct answer: {q.correctAnswer}
                    </p>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <div className='mt-8 text-center'>
        <a
          href='/'
          className='inline-block rounded-xl bg-indigo-600 px-8 py-3 font-semibold text-white transition hover:bg-indigo-700'
        >
          Try another quiz
        </a>
      </div>
    </main>
  )
}

export default TestPages
