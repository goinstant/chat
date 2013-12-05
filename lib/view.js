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
var binder = require('binder');

var colors = require('colors-common');
var XRegExp = require('./xregexp-all').XRegExp;

/** Templates */
var listTemplate = require('../templates/list-template.html');
var messageTemplate = require('../templates/message-template.html');

/** Constants */
var WRAPPER_CLASS = 'gi-chat';
var CHAT_WRAPPER_CLASS = 'gi-chat-wrapper';
var MESSAGE_CLASS = 'gi-message';
var LOCAL_MESSAGE_CLASS = 'gi-local-message';
var MESSAGE_LIST_CLASS = 'gi-message-list';
var MESSAGE_INPUT_CLASS = 'gi-message-input';
var MESSAGE_BTN_CLASS = 'gi-message-btn';
var OVERRIDE_CLASS = 'gi-override';
var COLLAPSE_BTN_CLASS = 'gi-collapse';
var ANCHOR_CLASS = 'gi-anchor';
var RELATIVE_CLASS = 'gi-relative';
var ALIGN_LEFT_CLASS = 'gi-left';
var ALIGN_RIGHT_CLASS = 'gi-right';
var DATA_GOINSTANT_ID = 'data-goinstant-id';
var COLLAPSED_CLASS = 'collapsed';
var IMAGE_CLASS = 'gi-image';
var LINK_CLASS = 'gi-link';

var WIDGET_NAMESPACE = 'goinstant/widgets/chat';

var TEXT_URL_REGEX = /(\b(?:http[s]?:\/\/|www\.)[-A-Za-z0-9+&@#\/%?=~_|()!:,.;]*[-A-Za-z0-9+&@#/%=~_|()]\b)/ig;

/* Export View */
module.exports = View;

function View(userCache, options) {
  this._userCache = userCache;

  this._collapsed = options.collapsed;
  this._position = options.position;
  this._container = options.container;
  this._truncateLength = options.truncateLength;
  this._avatars = options.avatars;

  this._wrapper = null;
  this._chatWrapper = null;
  this._messageList = null;

  this.collapseBtn = null;
  this.messageInput = null;
  this.messageBtn = null;

  _.bindAll(this, [
    'toggleCollapse',
    'appendMessage',
    'prependMessage'
  ]);
}

View.prototype.initialize = function() {
  this._append();
};

View.prototype._append = function() {
  this._wrapper = document.createElement('div');
  this._wrapper.setAttribute('class', WRAPPER_CLASS + ' ' + OVERRIDE_CLASS);

  this._wrapper.innerHTML = listTemplate;

  this._chatWrapper = this._wrapper.querySelector('.' + CHAT_WRAPPER_CLASS);
  this._messageList = this._wrapper.querySelector('.' + MESSAGE_LIST_CLASS);
  this._messageInput = this._wrapper.querySelector('.' + MESSAGE_INPUT_CLASS);
  this._messageBtn = this._wrapper.querySelector('.' + MESSAGE_BTN_CLASS);

  // Check if user passed a container and if so, append user list to it
  if (this._container) {
    this._container.appendChild(this._wrapper);

    classes(this._wrapper).add(RELATIVE_CLASS);

  } else {
    document.body.appendChild(this._wrapper);

    classes(this._wrapper).add(ANCHOR_CLASS);
  }

  this._collapseBtn = this._wrapper.querySelector('.' + COLLAPSE_BTN_CLASS);

  // Check if user passed the option for collapsed on load
  this._setCollapse(this._collapsed);

  // Pass the position either default or user set as a class
  if (!this._container && this._position === 'right') {
    classes(this._wrapper).add(ALIGN_RIGHT_CLASS);

  } else if (!this._container) {
    classes(this._wrapper).add(ALIGN_LEFT_CLASS);
  }
};

View.prototype.getUI = function() {
  var chatInterface = {
    collapseBtn: this._collapseBtn,
    messageInput: this._messageInput,
    messageBtn: this._messageBtn
  };

  return chatInterface;
};

View.prototype.toggleCollapse = function() {
  this._setCollapse(!this._collapsed);
};

View.prototype._setCollapse = function(toggle) {
  if (toggle) {
    classes(this._chatWrapper).add(COLLAPSED_CLASS);
    classes(this._collapseBtn).add(COLLAPSED_CLASS);

    this._collapsed = true;

  } else {
    classes(this._chatWrapper).remove(COLLAPSED_CLASS);
    classes(this._collapseBtn).remove(COLLAPSED_CLASS);

    this._collapsed = false;

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
 *
 *
 */
View.prototype._createMessage = function(message) {
  var user = message.user;

  var shortName = truncate(user.displayName, this._truncateLength);

  // message vars
  var vars = {
    id: message.id,
    shortName: shortName
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
 *
 *
 */
View.prototype._renderText = function(textEl, text) {
  var nodes = XRegExp.split(text, TEXT_URL_REGEX);
  var tasks = [];

  var self = this;

  _.each(nodes, function(node, index) {

    // Check if the node is just text
    if (!node.match(TEXT_URL_REGEX)) {
      nodes[index] = document.createTextNode(node);
      return;
    }

    // Check if the url node is an img
    tasks.push(_.bind(self._handleImg, self, node));

    // Make URL absolute
    if (node.substring(0, 4) !== 'http') {
      node = 'http://' + node;
    }

    var linkEl = document.createElement('a');
    var textNode = document.createTextNode(node);

    classes(linkEl).add(LINK_CLASS);
    linkEl.href = node;
    linkEl.target = '_blank'; // Opens page in new window/tab
    linkEl.appendChild(textNode);
    nodes[index] = linkEl;
  });

  // Add in-line textNodes and links first
  _.each(nodes, function(node, index) {
    if (node === '') {
      return;
    }

    textEl.appendChild(node);
  });

  // Handle images after the message has been appended to prevent delay.
  async.parallel(tasks, function(err, images) {

    if (images && !_.isArray(images)) {
      images = [images];
    }

    // Append images at the end of the message block
    _.each(images, function(image) {
      if (!image) {
        return;
      }

      textEl.appendChild(image);
    });

    self._scrollChatToBottom();
  });
};

/**
 *
 *
 */
View.prototype._handleImg = function(node, cb) {
  validImage(node, function(img) {
    if (!img) {
      return cb();
    }

    classes(img).add(IMAGE_CLASS);

    return cb(null, img);
  });
};

/**
 *
 *
 */
View.prototype._scrollChatToBottom = function() {
  this._messageList.scrollTop = this._messageList.scrollHeight;
};

/**
 *
 *
 */
View.prototype.destroy = function() {

  if (this._wrapper) {
    this._wrapper.parentNode.removeChild(this._wrapper);
    this._wrapper = null;
  }
};

/**
 *
 */
function validImage(imgSrc, cb) {
  // Invalid img urls
  if (!imgSrc || !_.isString(imgSrc)) {
    return cb(null);
  }

  var img = new Image();
  img.onerror = function() {
    return cb(null);
  };

  img.onabort = function() {
    return cb(null);
  };

  img.onload = function() {
    return cb(img);
  };

  img.src = imgSrc;
}

/**
 *
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
