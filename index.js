/*jshint browser:true*/
/*global module, require*/

'use strict';

/**
 * @fileoverview
 * @module goinstant/components/user-list
 * @exports userListComponent
 */

/** Module dependencies */
var classes = require('classes');
var Binder = require('binder');
var async = require('async');
var _ = require('lodash');
var trim = require('trim');

var UserCache = require('usercache');
var colors = require('colors-common');

var errors = require('./lib/errors');

/** Templates */
var listTemplate = require('./templates/list-template.html');
var messageTemplate = require('./templates/message-template.html');

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
//var DATA_GOINSTANT_ID = 'data-goinstant-id';
var COLLAPSED_CLASS = 'collapsed';

var ENTER = 13;
var TAB = 9;

/** Valid Opts */
var VALID_OPTIONS = ['room', 'collapsed', 'position', 'container',
                     'truncateLength', 'avatars'];

var VALID_POSITIONS = ['left', 'right'];

var DISPLAY_NAME_REGEX = /\/displayName$/;
var AVATAR_URL_REGEX = /\/avatarUrl$/;
var MESSAGE_KEY_REGEX = /^\/messages\/\d+_\d+$/;

var defaultOpts = {
  room: null,
  collapsed: false,
  position: 'right',
  container: null,
  truncateLength: 10,
  avatars: true
};

module.exports = Chat;

/**
 * @constructor
 */
 function Chat(opts) {
  if (!opts || !_.isPlainObject(opts)) {
    throw errors.create('Chat', 'INVALID_OPTIONS');
  }

  var optionsPassed = _.keys(opts);
  var optionsDifference = _.difference(optionsPassed, VALID_OPTIONS);

  if (optionsDifference.length) {
    throw errors.create('Chat', 'INVALID_ARGUMENT');
  }
  if (!opts.room || !_.isObject(opts.room)) {
    throw errors.create('Chat', 'INVALID_ROOM');
  }
  if (opts.collapsed && !_.isBoolean(opts.collapsed)) {
    throw errors.create('Chat', 'INVALID_COLLAPSED');
  }
  if (opts.container && !_.isElement(opts.container)) {
    throw errors.create('Chat', 'INVALID_CONTAINER');
  }
  if (opts.position && !_.contains(VALID_POSITIONS, opts.position)) {
    throw errors.create('Chat', 'INVALID_POSITION');
  }
  if (opts.truncateLength && !_.isNumber(opts.truncateLength)) {
    throw errors.create('Chat', 'INVALID_TRUNCATELENGTH');
  }
  if (opts.avatars && !_.isBoolean(opts.avatars)) {
    throw errors.create('Chat', 'INVALID_AVATARS');
  }

  var validOpts = _.defaults(opts, defaultOpts);

  this._room = validOpts.room;
  this._collapsed = validOpts.collapsed;
  this._position = validOpts.position;
  this._container = validOpts.container;
  this._truncateLength = validOpts.truncateLength;
//  this._avatars = validOpts.avatars;
  this._wrapper = null;
  this._chatWrapper = null;
  this._collapseBtn = null;
  this._messageList = null;
  this._messageInput = null;
  this._messageBtn = null;
  this._isBound = false;

  this._userCache = new UserCache(this._room);

  _.bindAll(this, [
    '_handleCollapseToggle',
    '_getMessages',
    '_sendMessage'
  ]);
}

Chat.prototype.initialize = function(cb) {
  if (!cb || !_.isFunction(cb)) {
    throw errors.create('initialize', 'INVALID_CALLBACK');
  }
  // Append markup
  this._append();

  this._messagesKey = this._room.key('/messages');

  var tasks = [
    _.bind(this._userCache.initialize, this._userCache),
    this._getMessages
  ];

  var self = this;

  async.series(tasks, function(err) {
    if (err) {
      self.destroy(function() {
        // Ignore destroy errors here since we're erroring anyway.
        return cb(err);
      });

      return;
    }

    // Bind click event to collapse toggle.
    Binder.on(self._collapseBtn, 'click', self._handleCollapseToggle);

    self._isBound = true;

    return cb(null, self);
  });
};

Chat.prototype._append = function() {
  this._wrapper = document.createElement('div');
  this._wrapper.setAttribute('class', WRAPPER_CLASS + ' ' + OVERRIDE_CLASS);

  this._wrapper.innerHTML = listTemplate;

  this._chatWrapper = this._wrapper.querySelector('.' + CHAT_WRAPPER_CLASS);
  this._messageList = this._wrapper.querySelector('.' + MESSAGE_LIST_CLASS);
  this._messageInput = this._wrapper.querySelector('.' + MESSAGE_INPUT_CLASS);
  this._messageBtn = this._wrapper.querySelector('.' + MESSAGE_BTN_CLASS);

  Binder.on(this._messageInput, 'keydown', this._sendMessage);
  Binder.on(this._messageBtn, 'click', this._sendMessage);

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
  this._collapse(this._collapsed);

  // Pass the position either default or user set as a class
  if (!this._container && this._position === 'right') {
    classes(this._wrapper).add(ALIGN_RIGHT_CLASS);

  } else if (!this._container) {
    classes(this._wrapper).add(ALIGN_LEFT_CLASS);
  }
};

Chat.prototype._handleCollapseToggle = function() {
  this._collapse(!this._collapsed);
};

Chat.prototype._collapse = function(toggle) {
  if (toggle) {
    classes(this._chatWrapper).add(COLLAPSED_CLASS);
    classes(this._collapseBtn).add(COLLAPSED_CLASS);

    this._collapsed = true;

  } else {
    classes(this._chatWrapper).remove(COLLAPSED_CLASS);
    classes(this._collapseBtn).remove(COLLAPSED_CLASS);

    this._collapsed = false;
  }
};

Chat.prototype._sendMessage = function(event) {
  // Only accept these
  var isValidKey = (event.keyCode === ENTER || event.keyCode === TAB) && event.type === 'keydown';
  var isValidClick = event.type === 'click';

  // Ignore other events
  if (!isValidKey && !isValidClick) {
    return;
  }

  var message = {};

  message.text = _.escape(this._messageInput.value);

  if (message.text  === '') {
    return;
  }

  message.id = new Date().getTime() + '_' + Math.floor(Math.random() * 999999999 + 1);
  message.user = this._userCache.getLocalUser();

  var self = this;

  this._messagesKey.key(message.id).set(message, function(err, value, context) {
    if (err) {
      return;
    }

    self._addMessage(message);
    self._messageInput.value = '';
  });
};

Chat.prototype._getMessages = function(cb) {

  var self = this;

  this._messagesKey.get(function(err, value, context) {
    if (err) {
      return;
    }

    // sort by time
    value = _.sortBy(value, function(v, k) { return k; });

    for (var i in value) {
      self._addMessage(value[i]);
    }

    cb();
  });

  this._messagesKey.on('set', {bubble:true, listener:function(value, context) {

    // Only accept message keys: /messages/integer_integer
    if (MESSAGE_KEY_REGEX.test(context.key)) {
      self._addMessage(value);
    }
  }});
};

Chat.prototype._addMessage = function(message) {

  var vars = {
    id: message.id,
    text: message.text,
    shortName: truncate(message.user.displayName, this._truncateLength),
    avatarColor: message.user.avatarColor,
    avatarUrl: message.user.avatarUrl
  };

  var template = _.template(messageTemplate, vars);
  var entry = document.createElement('li');

  entry.innerHTML = template;
  entry.title = message.user.displayName;
  entry.id = message.id;
  entry.setAttribute('data-goinstant-id', message.id);

  classes(entry).add(message.user.id);
  classes(entry).add(MESSAGE_CLASS);

  var localUser = this._userCache.getLocalUser();
  if (message.user.id === localUser.id) {
    classes(entry).add(LOCAL_MESSAGE_CLASS);
  }

  this._messageList.appendChild(entry);

  this._messageList.scrollTop = this._messageList.scrollHeight;
};

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

Chat.prototype.destroy = function(cb) {
  if (!cb || !_.isFunction(cb)) {
    throw errors.create('destroy', 'INVALID_CALLBACK');
  }

  if (this._isBound) {
    Binder.off(this._collapseBtn, 'click', this._handleCollapseToggle);
    this._isBound = false;
  }

  if (this._wrapper) {
    this._wrapper.parentNode.removeChild(this._wrapper);
    this._wrapper = null;
  }

  this._userCache.destroy(cb);
};
