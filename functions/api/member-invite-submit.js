const { admin, db, initError } = require('../lib/firestoreAdmin')
const { verifyJwt } = require('../lib/jwtHelpers')

const jwtSecret =
  process.env.MEMBER_INVITE_JWT_SECRET || process.env.CHECKIN_JWT_SECRET || ''

async function findExistingMember({ churchId, phone, email }) {
  if (!churchId) return null

  const normalizedPhone = phone?.trim()
  const normalizedEmail = email?.trim()?.toLowerCase()

  const queries = []

  if (normalizedPhone) {
    queries.push(
      db
        .collection('members')
        .where('churchId', '==', churchId)
        .where('phone', '==', normalizedPhone)
        .limit(1)
        .get()
    )
  }

  if (normalizedEmail) {
    queries.push(
      db
        .collection('members')
        .where('churchId', '==', churchId)
        .where('email', '==', normalizedEmail)
        .limit(1)
        .get()
    )
  }

  if (queries.length === 0) return null

  const snapshots = await Promise.all(queries)

  for (const snap of snapshots) {
    if (!snap.empty) {
      const doc = snap.docs[0]
      return { id: doc.id, data: doc.data() }
    }
  }

  return null
}

function splitName(name = '') {
  const trimmed = name.trim()
  if (!trimmed) return { firstName: '', lastName: '' }
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' }
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({
      status: 'error',
      message: 'Method not allowed. Use POST.',
    })
  }

  if (initError) {
    return response.status(500).json({
      status: 'error',
      message: initError.message || 'Unable to initialize Firebase.',
    })
  }

  if (!jwtSecret) {
    return response.status(500).json({
      status: 'error',
      message:
        'MEMBER_INVITE_JWT_SECRET (or CHECKIN_JWT_SECRET) environment variable is not configured.',
    })
  }

  const {
    token,
    firstName,
    lastName,
    phone,
    email,
    status,
    dateOfBirth,
    referralSource,
    referralSourceOther,
    reasonForVisit,
    prayerRequestPrivate,
    wantsLeaderCall,
    preferredCallTime,
    journeyStatus,
    journeyNotes,
    familyMembers,
  } = request.body || {}

  if (!token) {
    return response.status(400).json({
      status: 'error',
      message: 'Invite token is required.',
    })
  }

  const trimmedPhone = (phone || '').trim()
  const trimmedFirst = (firstName || '').trim()
  const trimmedLast = (lastName || '').trim()
  const trimmedEmail = (email || '').trim().toLowerCase()
  const trimmedDob = typeof dateOfBirth === 'string' ? dateOfBirth.trim() : ''
  const trimmedReferralSource =
    typeof referralSource === 'string' ? referralSource.trim().toUpperCase() : ''
  const trimmedReferralOther =
    typeof referralSourceOther === 'string' ? referralSourceOther.trim() : ''
  const trimmedReasonForVisit =
    typeof reasonForVisit === 'string' ? reasonForVisit.trim() : ''
  const wantsCall =
    wantsLeaderCall === true ||
    wantsLeaderCall === 'true' ||
    wantsLeaderCall === 'YES'
  const trimmedPreferredCallTime = wantsCall
    ? typeof preferredCallTime === 'string'
      ? preferredCallTime.trim()
      : ''
    : ''
  const journeyStatusValue =
    typeof journeyStatus === 'string' && journeyStatus.trim()
      ? journeyStatus.trim().toUpperCase()
      : status || 'VISITOR'
  const trimmedJourneyNotes =
    typeof journeyNotes === 'string' ? journeyNotes.trim() : ''
  const wantsPrivatePrayer = prayerRequestPrivate !== false

  const normalizedFamilyMembers = Array.isArray(familyMembers)
    ? familyMembers
        .map((member) => ({
          relation:
            typeof member?.relation === 'string'
              ? member.relation.trim().toUpperCase()
              : '',
          name: typeof member?.name === 'string' ? member.name.trim() : '',
        }))
        .filter(
          (member) => ['SPOUSE', 'CHILD'].includes(member.relation) && member.name
        )
    : []

  if (!trimmedFirst && !trimmedLast) {
    return response.status(400).json({
      status: 'error',
      message: 'Please enter at least a first or last name.',
    })
  }

  if (!trimmedPhone && !trimmedEmail) {
    return response.status(400).json({
      status: 'error',
      message: 'Please enter a phone number or email so we can contact you.',
    })
  }

  try {
    const payload = verifyJwt(token, jwtSecret)

    if (payload.type !== 'member-invite') {
      return response.status(400).json({
        status: 'error',
        message: 'This invite token is not valid for member signup.',
      })
    }

    const churchId = payload.churchId

    const existing = await findExistingMember({
      churchId,
      phone: trimmedPhone,
      email: trimmedEmail,
    })

    if (existing) {
      return response.status(200).json({
        status: 'success',
        ok: true,
        memberId: existing.id,
        message: 'You are already on the list. Thank you for staying connected.',
      })
    }

    const memberRef = db.collection('members').doc()
    const now = admin.firestore.Timestamp.now()
    const journeyEntry = {
      status: journeyStatusValue,
      notes: trimmedJourneyNotes,
      timestamp: now,
    }

    await memberRef.set({
      churchId,
      firstName: trimmedFirst,
      lastName: trimmedLast,
      phone: trimmedPhone,
      email: trimmedEmail,
      status: status || 'VISITOR',
      ...(trimmedDob ? { dateOfBirth: trimmedDob } : {}),
      journeyStatus: journeyStatusValue,
      journeyNotes: trimmedJourneyNotes,
      journeyUpdatedAt: now,
      journeyHistory: [journeyEntry],
      referralSource: trimmedReferralSource,
      referralSourceOther:
        trimmedReferralSource === 'OTHER' ? trimmedReferralOther : '',
      reasonForVisit: trimmedReasonForVisit,
      prayerRequestPrivate: wantsPrivatePrayer,
      wantsLeaderCall: wantsCall,
      preferredCallTime: trimmedPreferredCallTime,
      familyGroupId: memberRef.id,
      familyRole: 'PRIMARY',
      source: 'INVITE',
      createdAt: now,
    })

    if (normalizedFamilyMembers.length > 0) {
      const familyWrites = normalizedFamilyMembers.map((member) => {
        const { firstName: familyFirst, lastName: familyLast } = splitName(member.name)
        const familyRef = db.collection('members').doc()
        return familyRef.set({
          churchId,
          firstName: familyFirst,
          lastName: familyLast,
          phone: '',
          email: '',
          status: 'VISITOR',
          journeyStatus: journeyStatusValue,
          journeyNotes: '',
          journeyUpdatedAt: now,
          journeyHistory: [
            {
              status: journeyStatusValue,
              notes: '',
              timestamp: now,
            },
          ],
          familyGroupId: memberRef.id,
          familyRole: member.relation,
          source: 'INVITE',
          createdAt: now,
        })
      })
      await Promise.all(familyWrites)
    }

    return response.status(200).json({
      status: 'success',
      ok: true,
      memberId: memberRef.id,
      message: 'Your details were received. Welcome!',
    })
  } catch (error) {
    const message = error.message || 'Unable to process invite.'
    const statusCode = message.includes('expired') ? 410 : 400
    return response.status(statusCode).json({
      status: 'error',
      message,
    })
  }
}
