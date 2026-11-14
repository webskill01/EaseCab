/** "PUNJAB TAXI & EASECAB" WhatsApp group — invite-only: join request, then approval over WhatsApp. */
export const WA_GROUP_URL = 'https://chat.whatsapp.com/EikNlnV2GMbBVXwFcwMXA7'
export const WA_APPROVAL_NUMBER = '919464180617' // wa.me format (country code, no +)
export const WA_APPROVAL_DISPLAY = '94641 80617'

/** wa.me chat with the approval number, request text pre-filled. */
export const waApprovalHref = (text) => `https://wa.me/${WA_APPROVAL_NUMBER}?text=${encodeURIComponent(text)}`
