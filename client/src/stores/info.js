import { defineStore } from 'pinia'

export const useInfoStore = defineStore('info', {
  state: () => ({
    notifications: {},

    showCodeComments: {
      audioRename: false,
      sleepCommand: false,
      streamRecord: false,
      tvseriesDl: false,
    }
  }),
  getters: {
    getNotifications (state) {
      return state.notifications
    },
  },
  actions: {
    updateNotification (info) {
      if (info.time && typeof info.time === 'number') {
        setTimeout(() => {
          this.notifications[ info.uuid ].animate = true
        }, 20)
        setTimeout(() => {
          delete this.notifications[ info.uuid ]
        }, info.time)
      }
      this.notifications[ info.uuid ] = info
    },
    removeNotification (uuid) {
      delete this.notifications[ uuid ]
    }
  },
})
