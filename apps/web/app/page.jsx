import { redirect } from 'next/navigation'

/** Root entry → the login flow. The legal pages (/privacy-policy, /terms) remain. */
export default function Home() {
  redirect('/login')
}
