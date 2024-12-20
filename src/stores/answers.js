// stores/answers.js
import { defineStore } from 'pinia'

export const useAnswersStore = defineStore('answers', {
  state: () => ({
    displayAnswers: [],

    systemMessages: [
      {
        role: 'system',
        content: 'Disini saya akan selalu menggunakan bahasa Indonesia',
      },
      {
        role: 'user',
        content: 'Selalu menggunakan bahasa Indonesia saat menjawab!',
      },
      {
        role: 'assistant',
        content: 'Baik dimengerti saya hanya akan menjawab dalam bahasa Indonesia',
      },
    ],
  }),

  actions: {
    addAnswer(role, content) {
      this.displayAnswers.push({ role, content })
    },

    clearAnswers() {
      this.displayAnswers = []
    },

    getMessages() {
      return [...this.systemMessages, ...this.displayAnswers]
    },
  },
})
