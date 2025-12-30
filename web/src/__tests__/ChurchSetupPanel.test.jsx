import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChurchSetupPanel from '../components/church/ChurchSetupPanel'

describe('ChurchSetupPanel', () => {
  const createProps = () => ({
    userEmail: 'pastor@example.com',
    churchName: 'Grace Chapel',
    churchAddress: '123 Hope St',
    churchCountry: 'Ghana',
    churchCity: 'Accra',
    churchPhone: '555-1234',
    onChangeChurchName: vi.fn(),
    onChangeChurchAddress: vi.fn(),
    onChangeChurchCountry: vi.fn(),
    onChangeChurchCity: vi.fn(),
    onChangeChurchPhone: vi.fn(),
    onCreateChurch: vi.fn(),
    onLogout: vi.fn(),
    loading: false,
  })

  it('shows the logged-in email and basic form scaffold', () => {
    render(<ChurchSetupPanel {...createProps()} />)

    expect(screen.getByText(/pastor@example.com/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/church name/i)).toHaveValue('Grace Chapel')
    expect(screen.getByRole('button', { name: /create church/i })).toBeEnabled()
  })

  it('wires up the form change handlers', async () => {
    const user = userEvent.setup()
    const props = createProps()
    render(<ChurchSetupPanel {...props} />)

    await user.type(screen.getByPlaceholderText(/city/i), ' New')
    expect(props.onChangeChurchCity).toHaveBeenCalled()

    await user.type(screen.getByPlaceholderText(/church phone number/i), '9')
    expect(props.onChangeChurchPhone).toHaveBeenCalled()
  })

  it('prevents interaction while saving', async () => {
    const user = userEvent.setup()
    const props = createProps()
    render(<ChurchSetupPanel {...props} loading />)

    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /saving/i }))
    expect(props.onCreateChurch).not.toHaveBeenCalled()
  })
})
