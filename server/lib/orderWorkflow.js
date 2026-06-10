const SOURCE_CHANNELS = {
  SEDIFEX_MARKET: 'sedifex_market',
  CLIENT_WEBSITE: 'client_website',
  BOOKING_WEBSITE: 'booking_website',
  POS: 'pos',
  MANUAL: 'manual',
}

const FULFILLMENT_OWNERS = {
  SEDIFEX: 'sedifex',
  STORE: 'store',
}

const PAYMENT_STATUSES = {
  UNPAID: 'unpaid',
  CHECKOUT_CREATED: 'checkout_created',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
}

const STORE_ACTION_STATUSES = {
  NOT_REQUIRED: 'not_required',
  PENDING_FOLLOW_UP: 'pending_store_follow_up',
  CONFIRMED_BY_STORE: 'confirmed_by_store',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
}

const SEDIFEX_ACTION_STATUSES = {
  NOT_REQUIRED: 'not_required',
  PAYMENT_ONLY: 'payment_only',
  PENDING_REVIEW: 'pending_review',
  ACCEPTED: 'accepted',
  PROCESSING: 'processing',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
}

const normalize = (value) => String(value || '').trim().toLowerCase().replace(/[-\s]+/g, '_')

const inferSourceChannel = (input = {}) => {
  const raw = normalize(
    input.sourceChannel ||
      input.source_channel ||
      input.channel ||
      input.metadata?.sourceChannel ||
      input.metadata?.channel ||
      input.attributes?.sourceChannel ||
      input.attributes?.channel
  )

  if (raw.includes('market')) return SOURCE_CHANNELS.SEDIFEX_MARKET
  if (raw.includes('booking')) return SOURCE_CHANNELS.BOOKING_WEBSITE
  if (raw.includes('website') || raw.includes('client')) return SOURCE_CHANNELS.CLIENT_WEBSITE
  if (raw.includes('pos')) return SOURCE_CHANNELS.POS
  if (raw.includes('manual')) return SOURCE_CHANNELS.MANUAL

  const orderType = normalize(input.orderType || input.order_type || input.metadata?.orderType)
  if (orderType.includes('booking') || orderType.includes('appointment')) {
    return SOURCE_CHANNELS.BOOKING_WEBSITE
  }

  return SOURCE_CHANNELS.CLIENT_WEBSITE
}

const classifyOrderWorkflow = (input = {}) => {
  const sourceChannel = inferSourceChannel(input)
  const orderType = normalize(input.orderType || input.order_type || input.type || input.metadata?.orderType)
  const isBooking =
    sourceChannel === SOURCE_CHANNELS.BOOKING_WEBSITE ||
    orderType.includes('booking') ||
    orderType.includes('appointment')

  if (sourceChannel === SOURCE_CHANNELS.SEDIFEX_MARKET) {
    return {
      sourceChannel,
      sourceLabel: 'Sedifex Market',
      fulfillmentOwner: FULFILLMENT_OWNERS.SEDIFEX,
      paymentStatus: input.paymentStatus || PAYMENT_STATUSES.CHECKOUT_CREATED,
      storeActionStatus: STORE_ACTION_STATUSES.NOT_REQUIRED,
      sedifexActionStatus: input.sedifexActionStatus || SEDIFEX_ACTION_STATUSES.PENDING_REVIEW,
      adminControlMode: 'full_sedifex_control',
      nextResponsibleParty: 'sedifex',
      visibleAdminActions: ['accept_order', 'confirm_order', 'process_order', 'mark_delivered', 'cancel_order', 'refund'],
      visibleStoreActions: ['view_order'],
    }
  }

  if (isBooking) {
    return {
      sourceChannel: SOURCE_CHANNELS.BOOKING_WEBSITE,
      sourceLabel: 'Booking Website',
      fulfillmentOwner: FULFILLMENT_OWNERS.STORE,
      paymentStatus: input.paymentStatus || PAYMENT_STATUSES.CHECKOUT_CREATED,
      storeActionStatus: input.storeActionStatus || STORE_ACTION_STATUSES.PENDING_FOLLOW_UP,
      sedifexActionStatus: SEDIFEX_ACTION_STATUSES.PAYMENT_ONLY,
      adminControlMode: 'payment_monitoring_only',
      nextResponsibleParty: 'store',
      visibleAdminActions: ['confirm_payment', 'view_order', 'view_payout', 'support_case'],
      visibleStoreActions: ['confirm_booking', 'reschedule', 'mark_attended', 'mark_completed', 'mark_no_show', 'cancel_booking'],
    }
  }

  if (sourceChannel === SOURCE_CHANNELS.POS || sourceChannel === SOURCE_CHANNELS.MANUAL) {
    return {
      sourceChannel,
      sourceLabel: sourceChannel === SOURCE_CHANNELS.POS ? 'POS' : 'Manual',
      fulfillmentOwner: FULFILLMENT_OWNERS.STORE,
      paymentStatus: input.paymentStatus || PAYMENT_STATUSES.PAID,
      storeActionStatus: input.storeActionStatus || STORE_ACTION_STATUSES.COMPLETED,
      sedifexActionStatus: SEDIFEX_ACTION_STATUSES.NOT_REQUIRED,
      adminControlMode: 'store_record_only',
      nextResponsibleParty: 'store',
      visibleAdminActions: ['view_order', 'view_payout'],
      visibleStoreActions: ['view_order', 'edit_record'],
    }
  }

  return {
    sourceChannel: SOURCE_CHANNELS.CLIENT_WEBSITE,
    sourceLabel: 'Client Website',
    fulfillmentOwner: FULFILLMENT_OWNERS.STORE,
    paymentStatus: input.paymentStatus || PAYMENT_STATUSES.CHECKOUT_CREATED,
    storeActionStatus: input.storeActionStatus || STORE_ACTION_STATUSES.PENDING_FOLLOW_UP,
    sedifexActionStatus: SEDIFEX_ACTION_STATUSES.PAYMENT_ONLY,
    adminControlMode: 'payment_monitoring_only',
    nextResponsibleParty: 'store',
    visibleAdminActions: ['confirm_payment', 'view_order', 'view_payout', 'support_case'],
    visibleStoreActions: ['confirm_order', 'prepare_order', 'mark_completed', 'cancel_order'],
  }
}

const applyWorkflowToOrder = (order = {}) => {
  const workflow = classifyOrderWorkflow(order)
  return {
    ...order,
    ...workflow,
    workflowVersion: '2026-06-10',
  }
}

module.exports = {
  SOURCE_CHANNELS,
  FULFILLMENT_OWNERS,
  PAYMENT_STATUSES,
  STORE_ACTION_STATUSES,
  SEDIFEX_ACTION_STATUSES,
  applyWorkflowToOrder,
  classifyOrderWorkflow,
  inferSourceChannel,
}
