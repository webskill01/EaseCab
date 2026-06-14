'use client'

import { useRouter } from 'next/navigation'
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
      className="rounded-md px-3 py-2 text-left text-sm text-ec-ink60 hover:bg-muted"
    >
      Log out
    </button>
  )
}
