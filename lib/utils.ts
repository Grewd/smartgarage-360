import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const ksh = (n: number) => 'KSh ' + n.toLocaleString('en-KE')

export const initialsOf = (name: string) => name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
