const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

// Create the express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Store connected employees and their data
let employees = {};
let boss = null;

// Serve static files (for serving HTML)
app.use(express.static('public'));

// Socket.io connection
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Employee joins
  socket.on('employeeJoin', (location) => {
    employees[socket.id] = { id: socket.id, location, active: false };
    console.log(`Employee ${socket.id} joined.`);
  });

  // Boss joins
  socket.on('bossJoin', () => {
    boss = { id: socket.id };
    console.log(`Boss ${socket.id} joined.`);
  });

  // Employee clicks "I am Active"
  socket.on('iAmActive', () => {
    if (employees[socket.id]) {
      employees[socket.id].active = true;
      console.log(`Employee ${socket.id} is active.`);

      // Notify the boss about the active employee
      if (boss) {
        io.to(boss.id).emit('activeEmployee', {
          id: socket.id,
          location: employees[socket.id].location
        });
      }
    }
  });

  // Employee sends updated location every 3 seconds
  socket.on('updateLocation', (location) => {
    if (employees[socket.id]) {
      employees[socket.id].location = location;
      if (boss && employees[socket.id].active) {
        // Send location updates to the boss
        io.to(boss.id).emit('employeeLocationUpdate', { id: socket.id, location });
      }
    }
  });

  // Boss sends their location every 3 seconds
  socket.on('bossLocationUpdate', (location) => {
    if (boss) {
      boss.location = location;
      // Send boss location to all active employees
      Object.keys(employees).forEach((employeeId) => {
        if (employees[employeeId].active) {
          io.to(employeeId).emit('bossLocationUpdate', { id: boss.id, location });
        }
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (employees[socket.id]) {
      delete employees[socket.id];
      console.log(`Employee ${socket.id} disconnected.`);
    } else if (socket.id === boss?.id) {
      boss = null;
      console.log('Boss disconnected.');
    }
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
