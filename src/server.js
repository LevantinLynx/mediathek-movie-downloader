const { EventEmitter } = require('events')
const events = new EventEmitter()
const path = require('path')
const server = require('http').createServer()
const express = require('express')
const app = express()
server.on('request', app)
const io = require('socket.io')(server)
app.use('/cache', express.static(path.resolve(__dirname, '..', 'cache')))
app.use('/', express.static(path.resolve(__dirname, '..', 'www')))

module.exports = {
  server,
  app,
  io,

  serverEvents: events
}
