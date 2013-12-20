/*jshint browser:true*/
/*global module, require*/

'use strict';

/**
 * @fileoverview
 * @module goinstant/widgets/chat/view
 * @exports view
 */

/** Module dependencies */
var classes = require('classes');
var async = require('async');
var _ = require('lodash');
var trim = require('trim');
var moment = require('moment');

var XRegExp = require('../vendor/xregexp/xregexp-all').XRegExp;

/** Templates */
var listTemplate = require('../templates/list-template.html');
var messageTemplate = require('../templates/message-template.html');

/**
 * @const
 */
var WRAPPER_CLASS = 'gi-chat';
var CHAT_WRAPPER_CLASS = 'gi-chat-wrapper';
var MESSAGE_CLASS = 'gi-message';
var LOCAL_MESSAGE_CLASS = 'gi-local-message';
var MESSAGE_LIST_CLASS = 'gi-message-list';
var MESSAGE_INPUT_CLASS = 'gi-message-input';
var MESSAGE_BTN_CLASS = 'gi-message-btn';
var OVERRIDE_CLASS = 'gi-override';
var COLLAPSE_BTN_CLASS = 'gi-collapse';
var COLLAPSE_WRAPPER_CLASS = 'gi-collapse-wrapper';
var ANCHOR_CLASS = 'gi-anchor';
var RELATIVE_CLASS = 'gi-relative';
var ALIGN_LEFT_CLASS = 'gi-left';
var ALIGN_RIGHT_CLASS = 'gi-right';
var DATA_GOINSTANT_ID = 'data-goinstant-id';
var COLLAPSED_CLASS = 'collapsed';
var IMAGE_CLASS = 'gi-image';
var LINK_CLASS = 'gi-link';

var TEXT_URL_REGEX = /(\b(?:http[s]?:\/\/|www\.)[-A-Za-z0-9+&@#\/%?=~_|()!:,.;]*[-A-Za-z0-9+&@#/%=~_|()]\b)/ig;

var TIME_FORMAT = 'dddd, h:mm a'; // Sunday, 9:43 pm
var LAST_WEEK_FORMAT = 'M-DD-YY, h:mm a'; // 12-16-13, 9:43 pm

var MINUTE = 60000;
var DAY = 86400000;

module.exports = View;

/**
 * @constructor
 */
function View(userCache, options) {
  this._userCache = userCache;

  this.collapsed = options.collapsed;
  this._position = options.position;
  this._container = options.container;
  this._truncateLength = options.truncateLength;
  this._avatars = options.avatars;

  this._wrapper = null;
  this._chatWrapper = null;
  this._messageList = null;

  this._collapseBtn = null;
  this._messageInput = null;
  this._messageBtn = null;
  this._collapseWrapper = null;

  this._urlRegex = TEXT_URL_REGEX;

  _.bindAll(this, [
    'toggleCollapse',
    'appendMessage',
    'prependMessage'
  ]);
}

/**
 * Initializes the chat view
 * @public
 */
View.prototype.initialize = function() {
  this._wrapper = document.createElement('div');
  this._wrapper.setAttribute('class', WRAPPER_CLASS + ' ' + OVERRIDE_CLASS);

  this._wrapper.innerHTML = listTemplate;

  this._chatWrapper = this._wrapper.querySelector('.' + CHAT_WRAPPER_CLASS);
  this._messageList = this._wrapper.querySelector('.' + MESSAGE_LIST_CLASS);
  this._messageInput = this._wrapper.querySelector('.' + MESSAGE_INPUT_CLASS);
  this._messageBtn = this._wrapper.querySelector('.' + MESSAGE_BTN_CLASS);
  this._collapseBtn = this._wrapper.querySelector('.' + COLLAPSE_BTN_CLASS);
  this._collapseWrapper = this._wrapper.querySelector('.' +
                                                      COLLAPSE_WRAPPER_CLASS);

  // Pass the position either default or user set as a class
  if (!this._container && this._position === 'right') {
    classes(this._wrapper).add(ALIGN_RIGHT_CLASS);

  } else if (!this._container) {
    classes(this._wrapper).add(ALIGN_LEFT_CLASS);
  }

  // If the collapsed param is specified, we use it, otherwise
  // get the collapse key and use its value
  if (_.isBoolean(this.collapsed)) {
    this._setCollapse(this.collapsed);
  } else {
    var localUser = this._userCache.getLocalUser();
    var collapseStatus =
      localUser.goinstant &&
      localUser.goinstant.widgets &&
      localUser.goinstant.widgets.chat &&
      localUser.goinstant.widgets.chat.collapsed;

    if (collapseStatus === undefined || collapseStatus === null) {
      collapseStatus = false;
    }

    this._setCollapse(collapseStatus);
  }
};

View.prototype.append = function() {
  // Check if user passed a container and if so, append user list to it
  if (this._container) {
    this._container.appendChild(this._wrapper);

    classes(this._wrapper).add(RELATIVE_CLASS);

  } else {
    document.body.appendChild(this._wrapper);

    classes(this._wrapper).add(ANCHOR_CLASS);
  }

  this._scrollChatToBottom();
};

/**
 * Gets the els that chat binds to
 * @public
 * @returns chatInterface An object containing the collapse button, message
 *                        input and message button
 */
View.prototype.getUI = function() {
  var chatInterface = {
    collapseBtn: this._collapseBtn,
    messageInput: this._messageInput,
    messageBtn: this._messageBtn,
    collapseWrapper: this._collapseWrapper
  };

  return chatInterface;
};

/**
 * Toggles the chat collapse
 * @public
 */
View.prototype.toggleCollapse = function() {
  this._setCollapse(!this.collapsed);
};

/**
 * Sets the collapse state of the chat widget
 * @private
 * @param {boolean} toggle true = collapses, false, opens
 */
View.prototype._setCollapse = function(toggle) {
  if (toggle) {
    classes(this._chatWrapper).add(COLLAPSED_CLASS);
    classes(this._collapseBtn).add(COLLAPSED_CLASS);

    this.collapsed = true;

  } else {
    classes(this._chatWrapper).remove(COLLAPSED_CLASS);
    classes(this._collapseBtn).remove(COLLAPSED_CLASS);

    this.collapsed = false;

    this._scrollChatToBottom();
  }
};

/**
 * Adds the message to the bottom of the list
 * @public
 * @param {object} message The message object
 */
View.prototype.appendMessage = function(message) {
  var self = this;

  var el = this._createMessage(message);
  self._messageList.appendChild(el);
  self._scrollChatToBottom();
};

/**
 * Adds the message to the top of the list
 * @public
 * @param {object} message The message object
 */
View.prototype.prependMessage = function(message) {
  var self = this;

  var el = this._createMessage(message);

  var firstChild = self._messageList.firstChild;

  if (firstChild) {
    self._messageList.insertBefore(el, firstChild);
    self._scrollChatToBottom();

    return;
  }

  self._messageList.appendChild(el);
  self._scrollChatToBottom();
};

/**
 * Creates a new message in the chat widget
 * @private
 * @param {object} message Contaisn the data needed to create the message
 * @returns {HTMLElement} The populated message el
 */
View.prototype._createMessage = function(message) {
  var user = message.user;

  var shortName = truncate(user.displayName, this._truncateLength);

  var formattedTime = formatTime(message.timestamp);

  // message vars
  var vars = {
    id: message.id,
    shortName: shortName,
    time: formattedTime
  };

  // message template
  var template = _.template(messageTemplate, vars);
  var itemEl = document.createElement('li');
  itemEl.innerHTML = template;

  // message text. avoid template, susceptible to XSS
  var textEl = itemEl.querySelector('.gi-text');
  itemEl.title = user.displayName;
  itemEl.id = message.id;
  itemEl.setAttribute(DATA_GOINSTANT_ID, message.id);

  // avatar color
  var colorEl = itemEl.querySelector('.gi-color');
  colorEl.style.backgroundColor = user.avatarColor;

  // avatar URL. avoid template, susceptible to XSS
  if (this._avatars && user.avatarUrl) {
    var avatarEl = colorEl.querySelector('.gi-avatar');

    var imgEl = document.createElement('img');
    imgEl.className = 'gi-avatar-img';
    imgEl.src = _.escape(user.avatarUrl);

    colorEl.style.backgroundImage = 'none';
    avatarEl.appendChild(imgEl);
  }

  // message classes
  classes(itemEl).add(user.id);
  classes(itemEl).add(MESSAGE_CLASS);

  var localUser = this._userCache.getLocalUser();
  if (user.id === localUser.id) {
    classes(itemEl).add(LOCAL_MESSAGE_CLASS);
  }

  message.text = _.unescape(message.text);

  this._renderText(textEl, message.text);

  return itemEl;
};

/**
 * Renders the text with links and images
 * @private
 * @param {HTMLElement} textEl The message element
 * @param {string} text The message text
 */
View.prototype._renderText = function(textEl, text) {
  var nodes = XRegExp.split(text, TEXT_URL_REGEX);
  var tasks = [];

  var imageEl = textEl.parentNode.querySelector('.gi-images');

  var self = this;

  _.each(nodes, function(node, index) {

    // Check if the node is just text
    if (!node.match(TEXT_URL_REGEX)) {
      nodes[index] = document.createTextNode(node);
      return;
    }

    // Make URL absolute
    if (node.substring(0, 4).toLowerCase() !== 'http') {
      node = 'http://' + node;
    }

    // Check if the url node is an img
    tasks.push(_.bind(self._validateImage, self, imageEl, node));

    var linkEl = document.createElement('a');
    var textNode = document.createTextNode(node);

    classes(linkEl).add(LINK_CLASS);
    linkEl.href = node;
    linkEl.target = '_blank'; // Opens page in new window/tab
    linkEl.appendChild(textNode);
    nodes[index] = linkEl;
  });

  // Add in-line textNodes and links first
  _.each(nodes, function(node) {
    if (node === '') {
      return;
    }

    textEl.appendChild(node);
  });

  // Handle images after the message has been appended to prevent delay.
  async.parallel(tasks, function() {

    // Remove the images container if empty
    if (!imageEl.children.length) {
      imageEl.parentNode.removeChild(imageEl);
    }

    self._scrollChatToBottom();
  });
};

/**
 * Handles loading a URL as an image
 * @private
 * @param {string} url The potential image URL
 * @param {function} cb A callback function to be called after attempting to
 *                      load the image
 */
View.prototype._validateImage = function(imageEl, url, cb) {
  if (!url || !_.isString(url)) {
    return cb(null);
  }

  var validated = false;

  var img = new Image();
  classes(img).add(IMAGE_CLASS);

  // img must be appended before setting the src.
  // Fixes an issue in IE9 where onload wouldn't trigger
  imageEl.appendChild(img);

  // Timeout after 10 seconds attempting to load image
  var timeoutId = window.setTimeout(clearImg, 10000);

  img.onerror = clearImg;

  img.onabort = clearImg;

  function clearImg() {
    if (validated) {
      return;
    }

    validated = true;

    window.clearTimeout(timeoutId);
    img.parentNode.removeChild(img);

    return cb(null);
  }

  img.onload = function() {
    if (validated) {
      // Timeout would have occurred, took too long to load image
      return;
    }

    validated = true;

    window.clearTimeout(timeoutId);

    return cb(null);
  };

  // Certain inputs can cause IE8 to throw an error when setting img.src
  try {
    img.src = url;

  } catch (err) {
    clearImg();
  }
};

/**
 * Scrolls the chat to the bottom
 * @private
 */
View.prototype._scrollChatToBottom = function() {
  this._messageList.scrollTop = this._messageList.scrollHeight;
};

/**
 * Destroys the chat view
 * @public
 */
View.prototype.destroy = function() {
  if (document.body.querySelector('.' + CHAT_WRAPPER_CLASS)) {
    this._wrapper.parentNode.removeChild(this._wrapper);
  }

  if (this._wrapper) {
    this._wrapper = null;
  }
};

/**
 * Truncates a displayName
 * @private
 * @param {string} str The displayName to truncate
 * @param {number} limit The maximum number of characters the resulting string
 *                       can be
 */
function truncate(str, limit) {
  var shortened = '';

  if (str.length > limit) {
    var substring = str.substring(0, limit);

    if (str[limit] === ' ') {
      return trim(substring);

    } else {
      return substring + '...';
    }
  }

  return shortened || str;
}

/**
 * Formats the message time based on days from now
 * @private
 * @param {number} timestamp The message timestamp
 * @returns {string} The correctly formatted time
 */
function formatTime(timestamp) {
  var now = new Date().getTime();

  // Calculate todays 00:00 in ms
  var zone = moment().zone() * MINUTE;
  var dayStart = now - (now % DAY) + zone;
  var diff = dayStart - timestamp;

  // Calculate how many days ago the message was created
  var days = Math.floor(diff / DAY);

  // Use 'day of week, h:mm' or 'mm-dd-yy, h:mm'
  var format = (days <= 6) ? TIME_FORMAT : LAST_WEEK_FORMAT;

  return moment(timestamp).format(format);

}
