'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { adminLogout } from '@/features/auth/services/adminApi'

export function LogoutButton() {
  const router = useRouter()
  async function onLogout() {
    try {
      await adminLogout()
    } finally {
      router.replace('/login')
    }
  }
  return (
    <button
      onClick={onLogout}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
    >
      <LogOut size={17} />
      Log out
    </button>
  )
}
