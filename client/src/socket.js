import { reactive } from "vue"
import { io } from "socket.io-client"

export const state = reactive({
  connected: false,
  loaded: false
})
export const socket = io(import.meta.env.VITE_SOCKET_URL)

socket.on("connect", () => {
  state.connected = true
  setTimeout(() => socket.emit('getInitialData'), 50)
})

socket.on("availableMovieMetaDataUpdate", () => {
  if (!state.loaded) setTimeout(() => { state.loaded = true }, 250)
})

socket.on("disconnect", () => {
  state.connected = false
})