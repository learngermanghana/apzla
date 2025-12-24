import { renderHook, waitFor } from '@testing-library/react'
import { act } from 'react'
import { useAuthProfile } from '../hooks/useAuthProfile'
import { onSnapshot } from 'firebase/firestore'
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
  const onSnapshot = vi.fn()
  return { doc, onSnapshot }
})

const onSnapshotMock = onSnapshot

describe('useAuthProfile', () => {
  beforeEach(() => {
    onSnapshotMock.mockReset()
    mockAuth.currentUser = null
  })

  it('loads a profile when authentication state changes', async () => {
    onSnapshotMock.mockImplementationOnce((ref, onNext) => {
      onNext(mockProfileSnapshot)
      return vi.fn()
    })

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
    onSnapshotMock.mockImplementationOnce((ref, _onNext, onError) => {
      onError(new Error('boom'))
      return vi.fn()
    })

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

    onSnapshotMock.mockImplementationOnce((ref, onNext) => {
      onNext(mockProfileSnapshot)
      return vi.fn()
    })

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
