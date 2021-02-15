const path = require('path');
const http = require('http');
const redis = require('redis');
const client = redis.createClient({
    host: '127.0.0.1',
    port: 6379 
});
const moment = require('moment');
const express = require('express');
const socketio = require('socket.io');
const formatMessage = require('./utils/messages');
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers
} = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);


//Store messages in chatroom
var chat_messages = [];


//Redis client
client.once('ready', function(){
      //Initialize Messages
      client.get('chat_app_messages', function(err, reply){
        if(reply) {
            chat_messages = JSON.parse(reply);
        }
    });
});

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

const botName = 'ChatCord Bot';

// Run when client connects
io.on('connection', socket => {
  socket.on('joinRoom', ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);
    // Welcome current user
    var time = moment().format('h:mm a')
    socket.emit('message', formatMessage(botName, 'Welcome to ChatCord!', time));

    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        formatMessage(botName, `${user.username} has joined the chat`, time)
      );

    // Send users and room info
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room)
    });
  });

  // Listen for chatMessage
  socket.on('chatMessage', msg => {
    const user = getCurrentUser(socket.id);
    var time = moment().format('h:mm a')
    io.to(user.room).emit('message', formatMessage(user.username, msg, time));

    chat_messages.push({
      'sender': user.username,
      'message': msg,
      'time': time
    });

    
  });

  // Runs when client disconnects
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);
    var time = moment().format('h:mm a')
    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage(botName, `${user.username} has left the chat`, time)
      );

      // Send users and room info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });
    }
  });
});

app.get('/get_messages', function(req, res){
  res.send(chat_messages);
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
