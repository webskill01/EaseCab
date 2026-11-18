/** "PUNJAB TAXI & EASECAB" WhatsApp group — the app never shows the link; the Manager-Bot sends it
 * in reply to the request template, then approves the join request from that same number. */
export const WA_APPROVAL_NUMBER = '919464180617' // wa.me format (country code, no +)
export const WA_APPROVAL_DISPLAY = '94641 80617'

/** wa.me chat with the approval number, request text pre-filled. */
export const waApprovalHref = (text) => `https://wa.me/${WA_APPROVAL_NUMBER}?text=${encodeURIComponent(text)}`
