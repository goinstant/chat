/*global $, window, goinstant, jQuery */
'use strict';

function connect(options) {
  var connectUrl = 'https://goinstant.net/goinstant-services/docs';
  var connection = new goinstant.Connection(connectUrl, options);

  connection.connect(function(err, connection) {
    if (err) {
      throw err;
    }

    var currentRoom = connection.room('chat');

    currentRoom.join(function(err) {
      if (err) {
        throw err;
      }

      // Create a new instance of the Chat widget
      var chat = new goinstant.widgets.Chat({
        room: currentRoom,
        messageExpiry: 1000*60*60*24 // 24 hours
      });

      // Initialize the Chat widget
      chat.initialize(function(err) {
        if (err) {
          throw err;
        }
        // Now it should render on the page
      });
    });
  });
}

$(window).ready(function() {
  // window.options comes from an inline script tag in each iframe.
  connect(window.options);
});
