import { ChatThread } from '@/features/chat/components/ChatThread'

/** A single chat thread (Step 22). The id is the chat (not the posted ride). */
export default function ChatThreadPage({ params }) {
  return <ChatThread chatId={params.id} />
}
