var express = require('express');
var app = express();
var io = require('socket.io').listen(app);

app.listen(8080);

// Socket rooms - 2 Players per room
var rooms = ['room1','room2','room3'];

// Collection of players currently connected
var usernames = {};

// Routing
app.get('/', function(req,res) {
  res.sendfile(__dirname + '/index.html');
});

io.sockets.on('connection', function (socket) {
  
  // Client "addUser" event listener
  socket.on('addUser', function(username) {
    
     // Store the username in the socket session for this client
    socket.username = username;
    
    // Store the room name in the socket session for this client
    socket.room = 'room1';
    
    // Add the client's username to the global list
    usernames[username] = username;
    
    // Send client to room 1
    socket.join('room1');
    
    // Echo to the client that they've connected
    socket.emit('updatechat', 'SERVER', 'You have connected to room 1');
    
    // Echo to room1 that a person has connected to their room
    socket.broadcast.to('room1').emit('updatechat', 'SERVER', username + ' has connected to this room');
    socket.emit('updaterooms', rooms, 'room1');
    
  });
  
  // Event listener for when client emits 'sendchat'
  socket.on('sendChat', function(data) {
    
    // Tell the client to execute 'updatechat' with 2 parameters
    io.sockets.in(socket.room).emit('updatechat', socket.username, data);
  });
  
  // Room switch event listener -- Will become open room search later!
  socket.on('switchRoom', function(newroom) {
    
    // Leave the current room (stored in session)
    socket.leave(socket.room);
    
    // Join new room, received as function parameter
    socket.join(newroom);
    socket.emit('updatechat', 'SERVER', 'you have connected to ' + newroom);
    
    // Send message to OLD room
    socket.broadcast.to(socket.room).emit('updatechat', 'SERVER', socket.username + ' has left this room');
    
    // Update socket session room title
    socket.room = newroom;
    socket.broadcast.to(newroom).emit('updatechat', 'SERVER', socket.username + ' has joined this room');
    socket.emit('updaterooms', rooms, newroom);
  });
  
  // Event listener for when a user disconnects
  socket.on('disconnect', function() {
    
    // Remove the username from the global usernames list
    delete usernames[socket.username];
    
    // Update list of users in chat, client-side
    io.sockets.emit('updateusers', usernames);
    
    // Echo globally that this client has left
    socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected');
    socket.leave(socket.room);
  });
});