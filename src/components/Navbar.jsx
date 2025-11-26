    import React, { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import logo from '../assets/logo.png'

export default function Navbar(){
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))

  useEffect(()=>{
    const root = document.documentElement
    if(theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  return (
    <header className='bg-white dark:bg-gray-800 shadow'>
      <div className='max-w-6xl mx-auto p-4 flex justify-between items-center'>
        <div className='flex items-center gap-3'>
          <img src={logo} alt='logo' className='w-12 h-12 object-contain rounded-full' />
          <div className='text-xl font-bold'>MNR Dashboard</div>
        </div>
        {/* <div className='flex items-center gap-4'>
          <button onClick={()=>setTheme(theme==='dark'?'light':'dark')} className='p-2 rounded bg-gray-100 dark:bg-gray-700'>
            {theme==='dark'? <Sun className='w-5 h-5'/> : <Moon className='w-5 h-5'/>}
          </button>
        </div> */}
      </div>
    </header>
  )
}
