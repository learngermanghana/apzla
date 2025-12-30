import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AuthPanel from '../components/auth/AuthPanel'

describe('AuthPanel', () => {
  const createProps = () => ({
    authMode: 'login',
    setAuthMode: vi.fn(),
    email: '',
    password: '',
    churchName: '',
    churchAddress: '',
    churchCity: '',
    churchPhone: '',
    onEmailChange: vi.fn(),
    onPasswordChange: vi.fn(),
    onChurchNameChange: vi.fn(),
    onChurchAddressChange: vi.fn(),
    onChurchCityChange: vi.fn(),
    onChurchPhoneChange: vi.fn(),
    onSubmit: vi.fn(),
    loading: false,
    errorMessage: '',
    disableSubmit: false,
    validationMessage: '',
    onForgotPassword: vi.fn(),
    passwordResetMessage: '',
    passwordResetError: '',
    passwordResetLoading: false,
  })

  it('switches between login and register modes', async () => {
    const user = userEvent.setup()
    const props = createProps()
    render(<AuthPanel {...props} />)

    await user.click(screen.getByRole('button', { name: /register/i }))

    expect(props.setAuthMode).toHaveBeenCalledWith('register')
  })

  it('shows forgot password affordance for login mode', () => {
    render(<AuthPanel {...createProps()} />)

    expect(screen.getByRole('button', { name: /forgot password/i })).toBeEnabled()
  })

  it('renders registration-specific fields when in register mode', () => {
    render(<AuthPanel {...createProps()} authMode="register" />)

    expect(screen.getByPlaceholderText(/church name/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/church address/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/city/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/church phone number/i)).toBeInTheDocument()
  })

  it('displays inline errors and disables submission when requested', async () => {
    const user = userEvent.setup()
    const props = createProps()
    render(
      <AuthPanel
        {...props}
        errorMessage="Bad credentials"
        disableSubmit
        loading={false}
      />
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Bad credentials')

    await user.click(screen.getByRole('button', { name: /login/i }))
    expect(props.onSubmit).not.toHaveBeenCalled()
  })
})
