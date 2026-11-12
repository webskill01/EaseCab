import { redirect } from 'next/navigation'

/** Seva hub is parked while Border Tax is its only service: the tab opens the form directly. */
export default function SevaPage() {
  redirect('/seva/border-tax')
}
