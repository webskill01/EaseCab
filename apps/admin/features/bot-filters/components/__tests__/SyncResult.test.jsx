import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SyncResult } from '../SyncResult'

describe('SyncResult', () => {
  it('says so when the server has no fleet panel configured', () => {
    render(<SyncResult peers={[]} />)
    expect(screen.getByText(/no fleet panel is configured/)).toBeTruthy()
  })

  it('shows each panel as synced or with its error', () => {
    render(<SyncResult peers={[{ peer: 'fleet', ok: true }, { peer: 'other', ok: false, error: 'HTTP 403' }]} />)
    expect(screen.getByText('Synced to fleet')).toBeTruthy()
    expect(screen.getByText('Not synced to other: HTTP 403')).toBeTruthy()
  })
})
