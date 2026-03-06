const { EventEmitter } = require('events')
const events = new EventEmitter()
const path = require('path')
const server = require('http').createServer()
const express = require('express')
const app = express()
server.on('request', app)
const options = {}
if (process.env.NODE_ENV !== 'production') {
  options.cors = { origin: '*', methods: ['GET', 'PUT', 'POST'] }
}
const io = require('socket.io')(server, options)
app.use('/cache', express.static(path.resolve(__dirname, '..', 'cache')))

if (process.env.NODE_ENV === 'production') {
  app.use('/', express.static(path.resolve(__dirname, '..', 'www')))

  app.get('/*path', (req, res) => {
    res.sendFile(path.resolve(__dirname, '..', 'www', 'index.html'))
  })
}

module.exports = {
  server,
  app,
  io,

  serverEvents: events
}
