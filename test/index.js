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
      off: sinon.stub()
    };
  }

  function createFakeUserKey(name) {
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

  fakeUser = {
    displayName: 'Guest 1',
    id: '1234'
  };

  fakeUser[colors.USER_PROPERTY] = '#FF0000';

  fakeUserKey = createFakeUserKey('guest1');

  fakeRoom = {
    self: sinon.stub().returns(fakeUserKey),
    key: createFakeKey
  };

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

  mockUserCache = {
    initialize: sinon.stub().yields(),
    destroy: sinon.stub().yields(),
    getLocalUser: sinon.stub().returns(fakeUser)
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
    var binder = require('binder');

    var sandbox;

    var testChat;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
      sandbox.restore();
    });

    beforeEach(function(done) {
      sandbox.stub(binder, 'on');

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
      sinon.assert.calledWith(binder.on, testChat._messageBtn, 'click', testChat._handleNewMessage);
    });
  });

  describe('add message', function() {
    beforeEach(function(done) {
      var options = {
        room: fakeRoom
      };

      testChat = new Chat(options);
      testChat._userCache = mockUserCache;
      testChat.initialize(done);
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

    it('adds a message', function() {
      var fakeMessage = {
        id: 12345,
        test: 'this is only a test',
        user: fakeUser
      };

      var rgb = 'rgb(255, 0, 0)';

      testChat._addMessage(fakeMessage);

      var msgEls = $(testChat._messageList).children();

      assert.equal(msgEls.length, 1);
      assert.equal(msgEls.eq(0).attr('id'), fakeMessage.id);
      assert.equal(msgEls.eq(0).attr('title'), fakeUser.displayName);
      assert.equal(msgEls.eq(0).find('.gi-color').css('background-color'), rgb);
    });

    it('adds a message with the user\'s avatar',function() {
      var fakeUser2 = _.clone(fakeUser);
      fakeUser2.avatarUrl = 'http://goinstant.com/test.png';

      var fakeMessage = {
        id: 67890,
        test: 'this is only a test 2',
        user: fakeUser2
      };

      testChat._addMessage(fakeMessage);

      var msgEl = $(testChat._messageList).children().eq(0);

      assert.equal(msgEl.find('.gi-avatar-img').attr('src'), fakeUser2.avatarUrl);
    });
  });
});
