// api/index.js
import { groq } from '@/lib/groq'

export async function getRespondAnswer(messages) {
  try {
    const response = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      messages: messages,
      max_tokens: 5000,
    })

    return response
  } catch (error) {
    console.error('Error fetching response:', error)
    throw error
  }
}
