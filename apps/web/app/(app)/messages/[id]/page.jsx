import { ChatThread } from '@/features/chat/components/ChatThread'

/** A single chat thread (Step 22). The id is the chat (not the posted ride). */
export default async function ChatThreadPage({ params }) {
  const { id } = await params
  return <ChatThread chatId={id} />
}
