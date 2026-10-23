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
      className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium text-ec-ink60 transition hover:bg-red-50 hover:text-ec-danger"
    >
      <LogOut size={16} />
      Log out
    </button>
  )
}
