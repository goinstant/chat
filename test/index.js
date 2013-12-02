/*jshint browser:true, node:false*/
/*global require, sinon*/

describe('Chat Component', function() {
  "use strict";

  var assert = window.assert;
  var async = require('async');
  var _ = require('lodash');
  var $ = require('jquery');

  var Chat = require('chat');

  var colors = require('colors-common');

  var fakeRoom;
  var fakeUser;
  var fakeUserKey;

  var fakeUsers;
  var fakeUsersKey;
  var fakeUserKeys;

  var mockUserCache;

  var testChat;

  function createFakeKey(name) {
    return {
      name: name,
      get: sinon.stub().yields(),
      set: sinon.stub(),
      key: createFakeKey,
      remove: sinon.stub().yields(),
      on: sinon.stub(),
      off: sinon.stub().callsArg(2)
    };
  }

  function createFakeUserKey(name) {
    return {
      name: name,
      get: sinon.stub().yields(),
      set: sinon.stub(),
      key: createFakeKey,
      remove: sinon.stub().yields(),
      on: sinon.stub().callsArg(2),
      off: sinon.stub().callsArg(2)
    };
  }

  beforeEach(function() {
    fakeRoom = {};
    fakeUser = {
      displayName: 'Guest 1',
      id: '1234'
    };
    fakeUser[colors.USER_PROPERTY] = '#FF0000';

    fakeUserKey = createFakeUserKey('guest1');
    fakeRoom.user = sinon.stub().yields(null, fakeUser, fakeUserKey);
    fakeRoom._platform = {
      _user: {
        id: fakeUser.id
      }
    };

    fakeRoom.self = sinon.stub().returns(fakeUserKey);

    fakeUsers = {
      1234: {
        displayName: 'Guest 1',
        id: '1234'
      },
      5678: {
        displayName: 'Guest 2',
        id: '5678'
      }
    };

    fakeUserKeys = [
      createFakeUserKey(),
      createFakeUserKey()
    ];

    fakeUsersKey = createFakeUserKey('/.users');

    fakeRoom.users = sinon.stub().yields(null, fakeUsers, fakeUserKeys);
    fakeRoom.key = sinon.stub();
    fakeRoom.key.returns(createFakeKey());
    fakeRoom.key.withArgs('/.users').returns(fakeUsersKey);
    fakeRoom.on = sinon.stub().callsArg(2);
    fakeRoom.off = sinon.stub().callsArg(2);
    fakeRoom.users.on = sinon.stub().callsArg(2);
    fakeRoom.users.off = sinon.stub().callsArg(2);

    mockUserCache = {
      initialize: sinon.stub().yields(),
      destroy: sinon.stub().yields()
    };
  });

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

      assert.isObject(testChat);
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

  describe('.initialize', function() {
    beforeEach(function() {
      var options = {
        room: fakeRoom
      };

      testChat = new Chat(options);
      testChat._userCache = mockUserCache;
    });

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

    it('successfully calls on initialize', function(done) {
      testChat.initialize(function(err) {
        if (err) {
          return done(err);
        }

        done();
      });
    });

    it('renders chat in the DOM', function(done) {
      testChat.initialize(function(err) {
        if (err) {
          return done(err);
        }

        var container = document.querySelector('.gi-chat');
        var inner = document.querySelector('.gi-message-list');
        var collapseBtn = document.querySelector('.gi-collapse');

        assert(container);
        assert(inner);
        assert(collapseBtn);

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

  describe('.destroy', function() {
    beforeEach(function(done) {
      var options = {
        room: fakeRoom
      };

      testChat = new Chat(options);
      testChat._userCache = mockUserCache;

      testChat.initialize(function(err) {
        if (err) {
          return done(err);
        }

        done();
      });
    });

    it('successfully calls destroy with no error returned', function(done) {
      testChat.destroy(function(err) {
        if (err) {
          return done(err);
        }

        done();
      });
    });

  });

  describe('send message', function() {
    var Binder = require('binder');

    var sandbox;

    var testChat;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
      sandbox.restore();
    });

    beforeEach(function(done) {
      sandbox.stub(Binder, 'on');

      var options = {
        room: fakeRoom
      };

      testChat = new Chat(options);
      testChat._userCache = mockUserCache;

      testChat.initialize(function(err) {
        if (err) {
          return done(err);
        }

        done();
      });
    });

    afterEach(function(done) {
      testChat.destroy(function(err) {
        if (err) {
          return done(err);
        }

        done();
      });
    });

    it('binds to the click event', function() {
      sinon.assert.calledWith(Binder.on, testChat._messageBtn, 'click', testChat._handleNewMessage);
    });

  });
});
