/**
 * jobActions.js  —  shared Supabase mutations for bid/request workflow.
 * Each function returns { success: boolean, error: string|null }.
 * None of these call alert() or confirm() — callers own UI feedback.
 */
import { supabase } from './supabaseClient';

/**
 * Accept a bid: set bid.status='accepted' and request.status='assigned'.
 * The DB trigger cascade_bid_accept will reject all other pending bids.
 * The DB trigger insert_bid_status_system_message will fire a system message.
 */
export async function acceptBid({ bidId, requestId }) {
  const { error: bidErr } = await supabase
    .from('bids')
    .update({ status: 'accepted' })
    .eq('id', bidId);

  if (bidErr) {
    console.error('[jobActions] acceptBid bid error:', bidErr);
    return { success: false, error: bidErr.message };
  }

  const { error: reqErr } = await supabase
    .from('service_requests')
    .update({ status: 'assigned' })
    .eq('id', requestId);

  if (reqErr) {
    console.error('[jobActions] acceptBid request error:', reqErr);
    return { success: false, error: reqErr.message };
  }

  return { success: true, error: null };
}

/**
 * Decline a bid: set bid.status='rejected'.
 * The DB trigger insert_bid_status_system_message will fire a system message.
 */
export async function declineBid({ bidId }) {
  const { error } = await supabase
    .from('bids')
    .update({ status: 'rejected' })
    .eq('id', bidId);

  if (error) {
    console.error('[jobActions] declineBid error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Mark a service request as completed.
 * The DB trigger trg_set_completed_at will set completed_at automatically.
 */
export async function markRequestComplete({ requestId }) {
  const { error } = await supabase
    .from('service_requests')
    .update({ status: 'completed' })
    .eq('id', requestId);

  if (error) {
    console.error('[jobActions] markRequestComplete error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}
