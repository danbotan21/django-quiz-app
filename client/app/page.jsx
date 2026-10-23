'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const DIFFICULTY_STYLES = {
  easy: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  hard: 'bg-rose-100 text-rose-700',
}

const Home = () => {
  const [searchQuiz, setSearchQuiz] = useState('')
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const getQuizzes = async (searchText) => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get(`${API_URL}/searchQuizes/`, {
        params: { search: searchText.trim() },
      })
      setQuizzes(response.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Could not load quizzes. Is the Django server running?')
      setQuizzes([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => getQuizzes(searchQuiz), 300) // Debounce search
    return () => clearTimeout(timer)
  }, [searchQuiz])

  return (
    <main className='mx-auto max-w-6xl px-6 pb-16'>
      <header className='flex items-center gap-3 py-6'>
        <span className='flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white'>
          <i className='fa-solid fa-circle-question'></i>
        </span>
        <span className='text-xl font-bold text-slate-800'>QuizApp</span>
      </header>

      <section className='mt-6 text-center'>
        <h1 className='text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl'>
          Test your knowledge
        </h1>
        <p className='mx-auto mt-3 max-w-xl text-lg text-slate-500'>
          Pick a quiz, beat the timer and see which answers you got right.
        </p>

        <div className='relative mx-auto mt-8 max-w-lg'>
          <i className='fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-slate-400'></i>
          <input
            type='text'
            placeholder='Search quizzes...'
            className='w-full rounded-full border border-slate-200 bg-white py-4 pl-12 pr-6 text-slate-800 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100'
            value={searchQuiz}
            onChange={(e) => setSearchQuiz(e.target.value)}
          />
        </div>
      </section>

      {error && (
        <div className='mx-auto mt-8 max-w-lg rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-rose-700'>
          {error}
        </div>
      )}

      {!loading && !error && quizzes.length === 0 && (
        <p className='mt-12 text-center text-slate-500'>
          No quizzes match &quot;{searchQuiz}&quot;.
        </p>
      )}

      <ul className='mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
        {quizzes.map((quiz) => (
          <li
            key={quiz.id}
            className='flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg'
          >
            <div className='flex items-start justify-between gap-3'>
              <h2 className='text-xl font-semibold text-slate-900'>
                {quiz.titleQuiz}
              </h2>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                  DIFFICULTY_STYLES[quiz.difficulty] || ''
                }`}
              >
                {quiz.difficulty}
              </span>
            </div>

            <dl className='mb-6 mt-5 grid grid-cols-3 gap-2 text-center'>
              <div className='rounded-xl bg-slate-50 py-3'>
                <dt className='text-xs text-slate-500'>Questions</dt>
                <dd className='text-lg font-semibold text-slate-800'>
                  {quiz.numberOfQuestions}
                </dd>
              </div>
              <div className='rounded-xl bg-slate-50 py-3'>
                <dt className='text-xs text-slate-500'>Time</dt>
                <dd className='text-lg font-semibold text-slate-800'>
                  {quiz.time} min
                </dd>
              </div>
              <div className='rounded-xl bg-slate-50 py-3'>
                <dt className='text-xs text-slate-500'>To pass</dt>
                <dd className='text-lg font-semibold text-slate-800'>
                  {quiz.scoreToPass}%
                </dd>
              </div>
            </dl>

            <a
              href={`quiz/${quiz.id}`}
              className='mt-auto rounded-xl bg-indigo-600 py-3 text-center font-semibold text-white transition hover:bg-indigo-700'
            >
              Start quiz
            </a>
          </li>
        ))}
      </ul>
    </main>
  )
}

export default Home
