/*jshint browser:true, node:false*/
/*global require, sinon*/

describe('Chat Widget', function() {
  "use strict";

  var assert = window.assert;
  var async = require('async');
  var _ = require('lodash');
  var $ = require('jquery');

  var Chat = require('chat');

  var fakeRoom;
  var fakeUI;

  var mockUserCache;
  var mockView;

  var testChat;

  function createFakeKey(name) {
    return {
      name: name,
      get: sinon.stub().yields(),
      set: sinon.stub(),
      key: createFakeKey,
      remove: sinon.stub().yields(),
      on: sinon.stub(),
      off: sinon.stub()
    };
  }

  fakeRoom = {
    key: createFakeKey,
    self: createFakeKey
  };

  mockUserCache = {
    initialize: sinon.stub().yields(),
    destroy: sinon.stub().yields()
  };

  fakeUI = {
    collapseBtn: document.createElement('div'),
    messageInput: document.createElement('input'),
    messageBtn: document.createElement('button'),
    collapseWrapper: document.createElement('div')
  };

  mockView = {
    initialize: sinon.stub(),
    append: sinon.stub(),
    destroy: sinon.stub(),
    getUI: sinon.stub().returns(fakeUI),
    toggleCollapse: sinon.stub()
  };

  describe('constructor', function() {
    afterEach(function(done) {
      var el = document.querySelector('.gi-chat');

      if (!testChat || !el) {
        return done();
      }

      testChat.destroy(function(err) {
        if (err) {
          return done(err);
        }

        testChat = null;

        done();
      });
    });

    it('returns new instance object correctly', function() {
      var options = {
        room: fakeRoom
      };

      testChat = new Chat(options);
      testChat._userCache = mockUserCache;
      testChat._view = mockView;

      assert.isObject(testChat);
      assert.isTrue(testChat instanceof Chat);
    });

    describe('errors', function() {
      it('throws an error if options is not passed', function() {
        assert.exception(function() {
          testChat = new Chat(null);
        }, 'Chat: Options was not found or invalid');
      });

      it('throws an error if options is not an object', function() {
        assert.exception(function() {
          testChat = new Chat('hi');
        }, 'Chat: Options was not found or invalid');
      });

      it('throws an error if options.room is not passed', function() {
        assert.exception(function() {
          testChat = new Chat({});
        }, 'Chat: Room was not found or invalid');
      });

      it('throws an error if options.room is not an object', function() {
        var options = {
          room: 'hi'
        };

        assert.exception(function() {
          testChat = new Chat(options);
        }, 'Chat: Room was not found or invalid');
      });

      it('throws an error if invalid options are passed', function() {
        var invalidOptions = {
          room: fakeRoom,
          fake: 'value'
        };

        assert.exception(function() {
          testChat = new Chat(invalidOptions);
        }, 'Chat: Invalid argument passed');
      });

      it('throws an error if collapsed is not a boolean', function() {
        var options = {
          room: fakeRoom,
          collapsed: 'True'
        };

        assert.exception(function() {
          testChat = new Chat(options);
        }, 'Chat: collapsed value must be a boolean');
      });

      it('throws an error if container is not a DOM element', function() {
        var options = {
          room: fakeRoom,
          container: 'DOM ELEMENT'
        };

        assert.exception(function() {
          testChat = new Chat(options);
        }, 'Chat: container must be a DOM element');
      });

      it('throws an error if position is not right || left', function() {
        var options = {
          room: fakeRoom,
          position: 'top'
        };

        assert.exception(function() {
          testChat = new Chat(options);
        }, 'Chat: position can only be "right" or "left"');
      });

      it('throws an error if position is not a string', function() {
        var options = {
          room: fakeRoom,
          position: true
        };

        assert.exception(function() {
          testChat = new Chat(options);
        }, 'Chat: position can only be "right" or "left"');
      });

      it('passes back an error if truncateLength is not a number', function() {
        var options = {
          room: fakeRoom,
          truncateLength: '10'
        };

        assert.exception(function() {
          testChat = new Chat(options);
        }, 'Chat: truncateLength can only be a number');
      });

      it('passes back an error if avatars is not a boolean', function() {
        var options = {
          room: fakeRoom,
          avatars: 'true'
        };

        assert.exception(function() {
          testChat = new Chat(options);
        }, 'Chat: avatars must be a boolean');
      });

      it('passes back an error if messageExpiry is not a number', function() {
        var options = {
          room: fakeRoom,
          messageExpiry: 'true'
        };

        assert.exception(function() {
          testChat = new Chat(options);
        }, 'Chat: messageExpiry can only be a number');
      });
    });
  });

  describe('#initialize', function() {
    beforeEach(function() {
      var options = {
        room: fakeRoom
      };

      testChat = new Chat(options);
      testChat._userCache = mockUserCache;
      testChat._view = mockView;

      sinon.spy(testChat._binder, 'on');
    });

    afterEach(function(done) {
      testChat._binder.on.restore();

      var el = document.querySelector('.gi-chat');

      if (!testChat || !el) {
        return done();
      }

      testChat.destroy(function(err) {
        if (err) {
          return done(err);
        }

        testChat = null;

        done();
      });
    });

    it('successfully calls on initialize', function(done) {
      testChat.initialize(function(err) {
        if (err) {
          return done(err);
        }

        done();
      });
    });

    it('successfully binds to DOM', function(done) {
      testChat.initialize(function(err) {
        if (err) {
          return done(err);
        }

        var binder = testChat._binder;

        binder.on.calledWith(
          testChat._binder.on,
          testChat._chatUI.collapseBtn,
          'click',
          testChat._view.toggleCollapse
        );

        binder.on.calledWith(
          testChat._binder.on,
          testChat._chatUI.messageInput,
          'keydown',
          testChat._keyDown
        );

        binder.on.calledWith(
          testChat._binder.on,
          testChat._chatUI.messageBtn,
          'click',
          testChat._keyDown
        );

        done();
      });
    });

    describe('errors', function() {
      it('throws an error if not passed a callback', function() {
        assert.exception(function() {
          testChat.initialize();
        }, 'initialize: Callback was not found or invalid');
      });

      it('throws an error if passed callback is not a function', function() {
        assert.exception(function() {
          testChat.initialize({});
        }, 'initialize: Callback was not found or invalid');
      });
    });
  });

  describe('#destroy', function() {
    beforeEach(function(done) {
      var options = {
        room: fakeRoom
      };

      testChat = new Chat(options);
      testChat._userCache = mockUserCache;
      testChat._view = mockView;

      sinon.spy(testChat._binder, 'off');

      testChat.initialize(function(err) {
        if (err) {
          return done(err);
        }

        done();
      });
    });

    afterEach(function() {
      testChat._binder.off.restore();
    });

    it('successfully calls destroy with no error returned', function(done) {
      testChat.destroy(function(err) {
        if (err) {
          return done(err);
        }

        done();
      });
    });

   it('successfully unbinds the DOM', function(done) {
     var binder = testChat._binder;

      testChat.destroy(function(err) {
        if (err) {
          return done(err);
        }

        binder.off.calledWith(
          testChat._binder.off,
          testChat._chatUI.collapseBtn,
          'click',
          testChat._view.toggleCollapse
        );

        binder.off.calledWith(
          testChat._binder.off,
          testChat._chatUI.messageInput,
          'keydown',
          testChat._keyDown
        );

        binder.off.calledWith(
          testChat._binder.off,
          testChat._chatUI.messageBtn,
          'click',
          testChat._keyDown
        );

        done();
      });
    });
  });

});
