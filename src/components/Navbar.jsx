import React, { useEffect } from 'react'
import logo from '/newlogo.png'

export default function Navbar(){

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark')     // force remove dark
    localStorage.setItem('theme', 'light') // lock light theme
  }, [])

  return (
    <header className='bg-white shadow'>
      <div className='max-w-6xl mx-auto p-4 flex justify-between items-center'>
        <div className='flex items-center gap-3'>
          <img 
            src={logo} 
            alt='logo' 
            className='w-12 h-12 object-contain rounded-full' 
          />
          <div className='text-xl font-bold text-gray-900'>
            MNR Dashboard
          </div>
        </div>
      </div>
    </header>
  )
}
