import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
import { VehicleDetail } from '../VehicleDetail'

describe('VehicleDetail', () => {
  it('joins make + model and shows registration + type', () => {
    renderWithIntl(<VehicleDetail profile={{ vehicleType: 'Sedan', verification: { carMake: 'Maruti', carModel: 'Dzire', carRegNo: 'PB10AB1234', rcSubmitted: true } }} />)
    expect(screen.getAllByText('Maruti Dzire').length).toBeGreaterThan(0)
    expect(screen.getAllByText('PB10AB1234').length).toBeGreaterThan(0)
    expect(screen.getByText('Sedan')).toBeInTheDocument()
  })

  it('falls back to — when vehicle fields are missing', () => {
    renderWithIntl(<VehicleDetail profile={{ verification: { rcSubmitted: false } }} />)
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2)
  })
})
