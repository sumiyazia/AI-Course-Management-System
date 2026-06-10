'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="inline-flex items-center justify-center rounded-md p-2 text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 dark:focus-visible:ring-gray-300"
    >
      <Sun className="h-5 w-5 transition-all dark:hidden" />
      <Moon className="hidden h-5 w-5 transition-all dark:block" />
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}
