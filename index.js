/*jshint browser:true*/
/*global module, require*/

'use strict';

/**
 * @fileoverview
 * @module goinstant/widgets/chat
 * @exports chat widget
 */

/** Module dependencies */
var binder = require('binder');
var _ = require('lodash');

var UserCache = require('usercache');
var WidgetIndicators = require('widget-indicators');

var View = require('./lib/view');
var errors = require('./lib/errors');

/**
 * @const
 */
var WIDGET_NAMESPACE = 'goinstant/widgets/chat';

var ENTER = 13;
var TAB = 9;

var MESSAGE_KEY_REGEX = /^\/goinstant\/widgets\/chat\/messages\/\d+_\d+$/;

var VALID_OPTIONS = ['room', 'collapsed', 'position', 'container',
                     'truncateLength', 'avatars', 'messageExpiry'];

var VALID_POSITIONS = ['left', 'right'];

var INDICATOR_TEXT = 'New Message';

var defaultOpts = {
  room: null,
  collapsed: null, // The collapse logic will later make this a false default
  position: 'right',
  container: null,
  truncateLength: 20,
  avatars: true,
  messageExpiry: null
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
  if (opts.messageExpiry && !_.isNumber(opts.messageExpiry)) {
    throw errors.create('Chat', 'INVALID_MESSAGEEXPIRY');
  }

  var validOpts = _.defaults(opts, defaultOpts);

  this._room = validOpts.room;
  this._messageExpiry = validOpts.messageExpiry;

  this._chatUI = null;
  this._isBound = false;

  this._binder = binder;

  this._userCache = new UserCache(this._room);
  this._widgetIndicators = null;
  this._view = new View(this._userCache, validOpts);

  _.bindAll(this, [
    '_getMessages',
    '_keyDown',
    '_collapseClick',
    '_recieveMessage'
  ]);
}

/**
 * Initializes the chat widget
 * @public
 * @param {function} cb A callback function called when initialization completes
 *                      or errors.
 */
Chat.prototype.initialize = function(cb) {
  if (!cb || !_.isFunction(cb)) {
    throw errors.create('initialize', 'INVALID_CALLBACK');
  }

  this._messagesKey = this._room.key(WIDGET_NAMESPACE).key('messages');

  var self = this;

  this._userCache.initialize(function(err) {
    if (err) {
      return cb(err);
    }

    self._view.initialize();

    self._getMessages(function(err) {
      if (err) {
        return cb(err);
      }

      self._chatUI = self._view.getUI();

      var indicatorOptions = {
        widgetElement: self._chatUI.messageInput,
        blinkElement: self._chatUI.collapseWrapper
      };

      self._widgetIndicators = new WidgetIndicators(indicatorOptions);

      self._binder.on(self._chatUI.collapseBtn, 'click', self._collapseClick);
      self._binder.on(self._chatUI.messageInput, 'keydown', self._keyDown);
      self._binder.on(self._chatUI.messageBtn, 'click', self._keyDown);

      self._isBound = true;

      var opts = {
        bubble: true,
        listener: self._recieveMessage
      };

      self._messagesKey.on('set', opts);

      self._view.append();

      return cb(null, self);
    });
  });
};

/**
 * Sends the message through GoInstant
 * @private
 * @param {string} text The message text
 * @param {function} cb A callback function to call when message sends
 */
Chat.prototype._sendMessage = function(text, cb) {

  var message = {};

  message.text = _.escape(text);
  message.id = generateMessageId();
  message.user = this._userCache.getLocalUser();
  message.timestamp = new Date().getTime();

  var self = this;

  var opts = {
    expire: this._messageExpiry
  };

  this._messagesKey.key(message.id).set(
    message,
    opts,
    function(err) {
    if (err) {
      return cb(err);
    }

    self._view.appendMessage(message);
    self._chatUI.messageInput.value = '';

    cb(null);
  });
};

/**
 * Handles keydowns on the message input and button
 * @private
 * @param {object} event The event object
 */
Chat.prototype._keyDown = function(event) {
  // Only accept these
  var isValidKey = (event.keyCode === ENTER || event.keyCode === TAB) && event.type === 'keydown';
  var isValidClick = event.type === 'click';

  // Ignore other events
  if (!isValidKey && !isValidClick) {
    return;
  }

  if (this._chatUI.messageInput.value  === '') {
    return;
  }

  this._sendMessage(this._chatUI.messageInput.value, function(err) {
    if (err) {
      return;
    }
  });
};
/**
 * Handles clicks on the collapse button
 * @private
 */
Chat.prototype._collapseClick = function() {
  var userKey = this._userCache.getLocalUserKey();
  this._view.toggleCollapse();
  userKey.key(WIDGET_NAMESPACE).key('collapsed').set(this._view.collapsed);
};

/**
 * Gets all messages stored in GoInstant
 * @private
 * @param {function} cb A callback function to call after all messages have
 *                      been retreived and rendered
 */
Chat.prototype._getMessages = function(cb) {

  var self = this;

  this._messagesKey.get(function(err, value) {

    if (err) {
      return cb(err);
    }

    // sort by time
    var messages = _.sortBy(value, function(v, k) { return k; }).reverse();

    _.each(messages, self._view.prependMessage);

    cb(null);
  });
};

/**
 * Handles recieving a new message from GoInstant
 * @private
 * @param {object} value The message data object
 * @param {object} context The GoInstant context object
 */
Chat.prototype._recieveMessage = function(value, context) {
  // Only accept message keys: /messages/integer_integer
  if (MESSAGE_KEY_REGEX.test(context.key)) {
    this._view.appendMessage(value);
    this._widgetIndicators.trigger(INDICATOR_TEXT);
  }
};

/**
 * Destroys the chat widget
 * @public
 * @param cb A callback function to call when destroy is complete
 */
Chat.prototype.destroy = function(cb) {
  if (!cb || !_.isFunction(cb)) {
    throw errors.create('destroy', 'INVALID_CALLBACK');
  }

  if (this._isBound) {
    this._binder.off(this._chatUI.collapseBtn, 'click', this._collapseClick);
    this._binder.off(this._chatUI.messageInput, 'keydown', this._keyDown);
    this._binder.off(this._chatUI.messageBtn, 'click', this._keyDown);

    this._isBound = false;
  }

  this._messagesKey.off('set', this._recieveMessage);
  this._view.destroy();

  this._userCache.destroy(cb);
};

/**
 * Generates a unique message ID
 * @private
 * @returns id A unique ID
 */
function generateMessageId() {
  var id =
    new Date().getTime() +
    '_' +
    Math.floor(Math.random() * 999999999 + 1);
  return id;
}
