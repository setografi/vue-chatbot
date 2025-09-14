// // api/index.js
// import { groq } from '@/lib/groq'

// export async function getRespondAnswer(messages) {
//   try {
//     const response = await groq.chat.completions.create({
//       model: 'openai/gpt-oss-120b',
//       messages: messages,
//       max_tokens: 5000,
//     })

//     return response
//   } catch (error) {
//     console.error('Error fetching response:', error)
//     throw error
//   }
// }

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
      max_tokens: 5000,
    })

    return response
  } catch (error) {
    console.error('Error fetching response:', error)
    throw error
  }
}
