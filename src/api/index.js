import { API_KEY } from '@/config/env'
import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: API_KEY,
  dangerouslyAllowBrowser: true,
})

export async function getRespondAnswer(messages) {
  try {
    const response = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: messages,
      temperature: 0.75,
      top_p: 0.9,
      max_tokens: 300,
      frequency_penalty: 0.3,
      presence_penalty: 0.2,
    })

    return response
  } catch (error) {
    console.error('Error fetching response:', error)
    throw error
  }
}
