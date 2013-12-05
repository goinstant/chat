/*jshint browser:true*/
/*global module, require*/

'use strict';

/**
 * @fileoverview
 * @module goinstant/widgets/chat
 * @exports chat widget
 */

/** Module dependencies */
var classes = require('classes');
var binder = require('binder');
var async = require('async');
var _ = require('lodash');
var trim = require('trim');

var UserCache = require('usercache');

var View = require('./lib/view');
var errors = require('./lib/errors');

/**
 * @const
 */
var WIDGET_NAMESPACE = 'goinstant/widgets/chat';

var ENTER = 13;
var TAB = 9;

var MESSAGE_KEY_REGEX = /^\/goinstant\/widgets\/chat\/messages\/\d+_\d+$/;

/**
 * Valid Opts
 */
var VALID_OPTIONS = ['room', 'collapsed', 'position', 'container',
                     'truncateLength', 'avatars', 'messageExpiry'];

var VALID_POSITIONS = ['left', 'right'];

var defaultOpts = {
  room: null,
  collapsed: false,
  position: 'right',
  container: null,
  truncateLength: 10,
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

  this._userCache = new UserCache(this._room);
  this._view = new View(this._userCache, validOpts);

  _.bindAll(this, [
    '_getMessages',
    '_handleNewMessage',
    '_messageHandler'
  ]);
}

Chat.prototype.initialize = function(cb) {
  if (!cb || !_.isFunction(cb)) {
    throw errors.create('initialize', 'INVALID_CALLBACK');
  }

  this._messagesKey = this._room.key(WIDGET_NAMESPACE + '/messages');

  this._view.initialize();
  this._chatUI = this._view.getUI();

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

    binder.on(self._chatUI.collapseBtn, 'click', self._view.toggleCollapse);
    binder.on(self._chatUI.messageInput, 'keydown', self._handleNewMessage);
    binder.on(self._chatUI.messageBtn, 'click', self._handleNewMessage);

    self._isBound = true;

    var opts = {
      bubble: true,
      listener: self._messageHandler
    };

    self._messagesKey.on('set', opts);

    return cb(null, self);
  });
};

function generateMessageId() {
  return new Date().getTime() + '_' + Math.floor(Math.random() * 999999999 + 1);
}

Chat.prototype.sendMessage = function(text, cb) {

  var message = {};

  message.text = _.escape(text);
  message.id = generateMessageId();
  message.user = this._userCache.getLocalUser();

  var self = this;

  var opts = {
    expire: this._messageExpiry
  };

  this._messagesKey.key(message.id).set(message, opts, function(err, value, context) {
    if (err) {
      return cb(err);
    }

    self._view.appendMessage(message);
    self._chatUI.messageInput.value = '';

    cb(null);
  });
};

Chat.prototype._handleNewMessage = function(event) {
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

  this.sendMessage(this._chatUI.messageInput.value, function(err) {
    if (err) {
      return;
    }
  });
};

Chat.prototype._getMessages = function(cb) {

  var self = this;

  this._messagesKey.get(function(err, value, context) {

    if (err) {
      return cb(err);
    }

    // sort by time
    var messages = _.sortBy(value, function(v, k) { return k; }).reverse();

    _.each(messages, self._view.prependMessage);

    cb(null);
  });
};

Chat.prototype._messageHandler = function(value, context) {
  // Only accept message keys: /messages/integer_integer
  if (MESSAGE_KEY_REGEX.test(context.key)) {
    this._view.appendMessage(value);
  }
};

Chat.prototype.destroy = function(cb) {
  if (!cb || !_.isFunction(cb)) {
    throw errors.create('destroy', 'INVALID_CALLBACK');
  }

  if (this._isBound) {
    binder.on(this._chatUI.collapseBtn, 'click', this._handleCollapseToggle);
    binder.on(this._chatUI.messageInput, 'keydown', this._handleNewMessage);
    binder.on(this._chatUI.messageBtn, 'click', this._handleNewMessage);

    this._isBound = false;
  }

  this._messagesKey.off('set', this._messageHandler);
  this._view.destroy();

  this._userCache.destroy(cb);
};
