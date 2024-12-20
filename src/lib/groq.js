import { API_KEY } from '@/config/env'
import Groq from 'groq-sdk'

export const groq = new Groq({
  apiKey: API_KEY,
  dangerouslyAllowBrowser: true,
})
