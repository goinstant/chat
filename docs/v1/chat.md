# Chat

[Github Link](html/chat_github.html "include")

The Chat widget provides real-time messaging inside
a room of your application.

[Chat](html/chat_demo_iframe.html "include")

You can render it collapsed, specify a container to render it in, truncate user
displaynames after a certain length, and expire messages after a certain time.

The displayed name for a user comes from the user's `displayName` attribute,
passed along with their JWT, and set on the key `/users/:id`.

## Feature List
- Parses a message for URLs and creates a clickable link in the message.
- Parses a message for image URLs and displays both a link to the image and an image preview in the message.
- Messages contain a formatted timestamp indicating when the message was sent.
- New message indicators will trigger when the chat widget does not have focus.
- An audible new message indicator is triggered when the chat widget does not have focus.
- The collapsed state of the widget is stored on the user object between initializations to allow the widget to reload as it was last seen by the user.

## Table of Contents

1. [Code Example](#code-example)
1. [HTML](#html)
1. [CSS](#css)
1. [Constructor](#constructor)
1. [Chat#initialize](#chat#initialize)
1. [Chat#destroy](#chat#destroy)
1. [Related Information](#related-information)

## Code Example

### 1. Include our CDN assets:

#### Note on Versioning

Specific version of widgets can be found on our [CDN](https://cdn.goinstant.net/).

```html
<script type="text/javascript" src="https://cdn.goinstant.net/v1/platform.min.js"></script>
<script type="text/javascript" src="https://cdn.goinstant.net/widgets/chat/latest/chat.min.js"></script>
<!-- CSS is optional -->
<link rel="stylesheet" href="https://cdn.goinstant.net/widgets/chat/latest/chat.css" />
```

```js
// Connect URL
var url = 'https://goinstant.net/YOURACCOUNT/YOURAPP';

// Connect to GoInstant
goinstant.connect(url, function(err, platformObj, roomObj) {
  if (err) {
    throw err;
  }

  // Create a new instance of the Chat widget
  var chat = new goinstant.widgets.Chat({
    room: roomObj
  });

  // Initialize the Chat widget
  chat.initialize(function(err) {
    if (err) {
      throw err;
    }
    // Now it should render on the page
  });
});
```

## HTML

### Chat

The widget is rendered to a `div` that is appended to page body after `#initialize` has successfully completed.
There are two main child elements in a chat: `.gi-chat-wrapper` and `.gi-collapse`.
The `.gi-chat-wrapper` div contains the message history (`.gi-message-list`) and the new message form (`.gi-message-form`).
The `.gi-collapse` div is a container for the collapse button.

```html
<div class="gi-chat gi-override">
  <div class="gi-collapse-wrapper">
    <div class="gi-collapse">
      <span class="gi-icon"></span>
    </div>
  </div>
  <div class="gi-chat-wrapper">
    <ul class="gi-message-list">
      <!-- Chat messages go here -->
    </ul>
    <div class="gi-message-form">
      <input class="gi-message-input" type="text">
      <button class="gi-message-btn">Send</button>
    </div>
  </div>
</div>
```

### Message Element

Each message (`.gi-message`) is a list item (`li`) appended to an unordered list (`.gi-message-list`). There are three child elements for each message: `.gi-color`, `.gi-name`, and `.gi-text`.
The `.gi-color` div displays the user's avatarColor and avatarUrl.
The `.gi-name` div displays the user's displayName.
The `.gi-text` div displays the message text.

```html
<li class="gi-message">
  <div class="gi-color"></div>
    <div class="gi-avatar">
      <img class="gi-avatar-img" src="http://YOURDOMAIN.com/YOURAVATAR.png">
    </div>
  <div class="gi-name">Guest</div>
  <div class="gi-text">Hi</div>
  <span class="gi-time">Monday, 1:10 pm</span>
</li>
```

## CSS

### Note on gi-override

Each class is prefixed with `gi` to avoid conflicts.  The top-level container
also has a `.gi-override` class. Our goal is to make each widget as easy as
possible to customize.

If you have not included our CSS file, you do not need to use the `gi-override`
class when styling the widget.

This stylesheet provides a good starting point for customizing the chat widget.

```css
.gi-chat.gi-override {
  /* Add custom styles */
}

.gi-chat.gi-override .gi-message-list {
  /* Add custom styles */
}

.gi-chat.gi-override .gi-message {
  /* Add custom styles */
}

.gi-chat.gi-override .gi-local-message {
  /* Add custom styles */
}

.gi-chat.gi-override .gi-color {
  /* Add custom styles */
}

.gi-chat.gi-override .gi-user {
  /* Add custom styles */
}

.gi-chat.gi-override .gi-text {
  /* Add custom styles */
}

.gi-chat.gi-override .gi-time {
  /* Add custom styles */
}

.gi-chat.gi-override .gi-message-form {
  /* Add custom styles */
}

.gi-chat.gi-override .gi-message-input {
  /* Add custom styles */
}

.gi-chat.gi-override .gi-message-btn {
  /* Add custom styles */
}

.gi-chat.gi-override .gi-collapse {
  /* Add custom styles */
}

.gi-chat.gi-override .gi-widget-blink,
.gi-chat.gi-override .gi-widget-blink .gi-collapse {
  /* Add custom styles */
}
```

## Constructor

Creates the Chat instance with customizable options.

### Methods

- ###### **new Chat(optionsObject)**

### Parameters

| optionsObject |
|:---|
| Type: [Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) |
| An object with the following properties: |
| - `room` is the [Room](https://developers.goinstant.net/v1/rooms/index.html).|
| - `container` is an optional DOM element that, if provided, the chat will render in.|
| - `position` [**default: "right"**] is a string, either "left" or "right", for setting the initial side of the browser window that the chat is anchored to.|
| - `collapsed` [**default: false**] is a [Boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean) where, if true, the chat will be initially rendered collapsed. This option overrides the default behavior of remembering a user's collapse status for initialization.|
| - `truncateLength` [**default: 20**] determines the maximum length of a user's display name in chat messages before being truncated.|
| - `messageExpiry` is an optional number of milliseconds after which messages will expire.|

### Example

```js
var options = {
  room: exampleRoom,
  position: 'left',
  collapsed: true,
  truncateLength: 15,
  messageExpiry: 60*1000 // 60 seconds
};

var chat = new goinstant.widget.Chat(options);
```

## Chat#initialize

Subscribes the Chat instance to updates from the server.

### Methods

- ###### **chat.initialize(callback(errorObject))**

### Parameters

| callback(errorObject) |
|:---|
| Type: [Function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function) |
| A callback function that is returned once the chat has completed being initalized. |
| - `errorObject` - will be null, unless an error has occurred. |

### Example

```js
chat.initialize(function(err) {
  // ready
});
```

## Chat#destroy

Destroys the Chat instance from the server.

### Methods

- ###### **chat.destroy(callback(errorObject))**

### Parameters

| callback(errorObject) |
|:---|
| Type: [Function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function) |
| A callback function that is returned once the chat has completed being destroyed. |
| - `errorObject` - will be null, unless an error has occurred. |

### Example
```js
chat.destroy(function(err) {
  // done
});
```

## Related Information

### How do I customize user colors?

See the [colors guide](./guides/colors.html).

### How do I set or change user avatars?

See the [avatars guide](./guides/avatars.html).

