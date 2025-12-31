import { renderHook, waitFor } from '@testing-library/react'
import { act } from 'react'
import { useAuthProfile } from '../hooks/useAuthProfile'
import { getDoc } from 'firebase/firestore'
import { auth } from '../firebase'

const mockAuth = auth
const mockProfileSnapshot = {
  exists: () => true,
  id: 'user-123',
  data: () => ({ role: 'admin', displayName: 'Rev. Ada' }),
}

const mockUser = {
  uid: 'user-123',
  reload: vi.fn(() => Promise.resolve()),
}

vi.mock('../firebase', () => ({
  auth: { currentUser: null },
  db: {},
}))

const authChangeHandlers = vi.hoisted(() => ({
  callback: null,
}))

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((authInstance, callback) => {
    authChangeHandlers.callback = callback
    return () => {}
  }),
}))

vi.mock('firebase/firestore', () => {
  const doc = vi.fn((db, collectionName, id) => ({ path: `${collectionName}/${id}` }))
  const getDoc = vi.fn()
  return { doc, getDoc }
})

const getDocMock = getDoc

describe('useAuthProfile', () => {
  beforeEach(() => {
    getDocMock.mockReset()
    mockAuth.currentUser = null
  })

  it('loads a profile when authentication state changes', async () => {
    getDocMock.mockResolvedValueOnce(mockProfileSnapshot)

    const { result } = renderHook(() => useAuthProfile())

    await act(async () => {
      authChangeHandlers.callback(mockUser)
    })

    await waitFor(() => expect(result.current.profileLoading).toBe(false))

    expect(result.current.user).toEqual(mockUser)
    expect(result.current.userProfile).toEqual({
      id: 'user-123',
      role: 'admin',
      displayName: 'Rev. Ada',
    })
    expect(result.current.profileError).toBe('')
  })

  it('surfaces profile errors and clears the cached profile', async () => {
    getDocMock.mockRejectedValueOnce(new Error('boom'))

    const { result } = renderHook(() => useAuthProfile())

    await act(async () => {
      authChangeHandlers.callback(mockUser)
    })

    await waitFor(() => expect(result.current.profileLoading).toBe(false))

    expect(result.current.userProfile).toBeNull()
    expect(result.current.profileError).toContain('boom')
  })

  it('refreshes the current user when refreshUser is called', async () => {
    mockAuth.currentUser = { ...mockUser, reload: vi.fn(() => Promise.resolve()) }

    const { result } = renderHook(() => useAuthProfile())

    await act(async () => {
      authChangeHandlers.callback(mockAuth.currentUser)
    })

    await waitFor(() => expect(result.current.profileLoading).toBe(false))

    await act(async () => {
      await result.current.refreshUser()
    })

    expect(mockAuth.currentUser.reload).toHaveBeenCalled()
    expect(result.current.user).toMatchObject({ uid: 'user-123' })
  })
})
