'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCoffee } from '@fortawesome/free-solid-svg-icons'

const Home = () => {
  const [searchQuiz, setSearchQuiz] = useState('')
  const [filteredQuizzes, setFilteredQuizzes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const getQuiz = async (searchText) => {
    if (!searchText.trim()) {
      setFilteredQuizzes([])
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await axios.get(`http://localhost:8000/searchQuizes/`, {
        params: {
          search: searchText,
        },
      })
      setFilteredQuizzes(response.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Failed to fetch quizzes. Please try again.')
      setFilteredQuizzes([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      getQuiz(searchQuiz)
    }, 300) // Debounce search

    return () => clearTimeout(timer)
  }, [searchQuiz])

  return (
    <div className='parent'>
      <div className='heading w-full'>
        <h1 className='text-5xl text-center font-bold mb-4 mr-2 mt-10'>
          All Quizzes
        </h1>
      </div>

      <div className='flex justify-center'>
        <div className='box-quiz-list rounded-2xl shadow-md my-8'>
          <div className='flex justify-center relative mb-4'>
            <form onSubmit={(e) => e.preventDefault()}>
              <span className='search'>
                <input
                  type='text'
                  placeholder='Search quizzes... '
                  className='py-4 px-8 mb-4 rounded-2xl border border-gray-300'
                  value={searchQuiz}
                  onChange={(e) => setSearchQuiz(e.target.value)}
                />
                <i className='search-icon fa-solid fa-magnifying-glass'></i>
              </span>
            </form>
          </div>

          {error && (
            <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4'>
              {error}
            </div>
          )}

          {loading && <p className='text-center py-4'>Loading quizzes...</p>}

          {/* Quizzes template */}
          <ul className='grid gap-8 grid-cols-1 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-1'>
            {filteredQuizzes && filteredQuizzes.length > 0
              ? filteredQuizzes.map((quiz) => (
                  <div
                    className='content-quizes bg-blue-200 rounded-md shadow-md'
                    key={quiz.id}
                  >
                    <a href={`quiz/${quiz.id}`}>
                      <h2 className='text-2xl font-semibold mb-2 '>
                        {quiz.titleQuiz}
                      </h2>
                    </a>
                    <p className='text-lg mb-2'>
                      Number of questions:
                      <span className='text-yellow-600 ml-1 text-xl'>
                        {quiz.numberOfQuestions}
                      </span>
                    </p>
                    <p className='text-base mb-2'>
                      Difficulty:
                      <span
                        className={` ${
                          quiz.difficulty === 'medium' ? 'text-blue-500' : ''
                        }  
                      ${quiz.difficulty === 'hard' ? 'text-red-500' : ''}
                      ${quiz.difficulty === 'easy' ? 'text-yellow-700' : ''}
                       text-lg hover:underline mt-2 ml-1`}
                      >
                        {quiz.difficulty}
                      </span>
                    </p>
                    <p className='text-base mb-2'>
                      Time:
                      <span className='text-xl ml-2'>{quiz.time} min</span>
                    </p>
                    <p className='score-to-pass'>
                      Score to pass: {quiz.scoreToPass}%
                    </p>
                  </div>
                ))
              : !loading && (
                  <p className='text-center py-4'>
                    No quizzes found. Try searching.
                  </p>
                )}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Home
