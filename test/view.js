/*jshint browser:true, node:false*/
/*global require, sinon*/

describe('View', function() {
  "use strict";

  var assert = window.assert;
  var async = require('async');
  var _ = require('lodash');
  var $ = require('jquery');
  var moment = require('moment');

  var View = require('chat/lib/view');

  var colors = require('colors-common');

  var fakeRoom;
  var fakeLocalUser;
  var fakeUsers;

  var fakeUserKey;
  var fakeUsersKey;

  var fakeDefaults;
  var mockUserCache;

  var testView;

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

  var palette = colors.DEFAULTS;

  fakeLocalUser = {
    id: 'local-1234',
    displayName: 'Me',
    goinstant: {
      widgets: {
        chat: {
          collapsed: false
        }
      }
    }
  };

  fakeLocalUser[colors.USER_PROPERTY] = palette.shift();

  fakeUsers = [
    {
      id: '1234',
      displayName: 'Guest 1',
    }
  ];

  _.each(fakeUsers, function(user, index) {
    user[colors.USER_PROPERTY] = palette[index];
  });

  mockUserCache = {
    initialize: sinon.stub().yields(),
    destroy: sinon.stub().yields(),
    getLocalUser: sinon.stub().returns(fakeLocalUser)
  };

  fakeRoom = {
    key: createFakeKey
  };

  fakeDefaults = {
    room: null,
    collapsed: null,
    position: 'right',
    container: null,
    truncateLength: 10,
    avatars: true,
    messageExpiry: null
  };

  describe('#initialize & #append', function() {

    var spyCollapse;
    beforeEach(function() {
      testView = new View(mockUserCache, fakeDefaults);
      spyCollapse = sinon.spy(testView, '_setCollapse');
    });

    afterEach(function() {
      testView.destroy();
    });

    it('appends the widget to the DOM', function() {
      testView.initialize();
      testView.append();

      var $chat = $('.gi-chat');
      var $collapseWrapper = $chat.children().eq(0);
      var $chatWrapper = $chat.children().eq(1);

      assert.equal($chat.length, 1);
      assert.equal($collapseWrapper.length, 1);
      assert.equal($chatWrapper.length, 1);
    });

    it('appends with collapseStatus from userCache', function() {
      fakeLocalUser.goinstant.widgets.chat.collapsed = true;
      testView.initialize();

      sinon.assert.calledOnce(spyCollapse);
      sinon.assert.calledWith(spyCollapse, true);
    });

    it('appends with collapseStatus from collapsed param', function() {
      fakeLocalUser.goinstant.widgets.chat.collapsed = true;
      testView.collapsed = false;
      testView.initialize();

      sinon.assert.calledOnce(spyCollapse);
      sinon.assert.calledWith(spyCollapse, false);
    });

    it('appends with collapseStatus false by default', function() {
      fakeLocalUser.goinstant.widgets.chat.collapsed = null;
      testView.initialize();

      sinon.assert.calledOnce(spyCollapse);
      sinon.assert.calledWith(spyCollapse, false);
    });
  });

  describe('#_createMessage', function() {
    var $chat;
    var $messages;

    beforeEach(function() {
      testView = new View(mockUserCache, fakeDefaults);
      testView.initialize();

      $chat = $('gi-chat');
      $messages = $chat.find('.gi-message-list');
    });

    afterEach(function() {
      testView.destroy();
    });

    it('creates a basic text-only message', function() {
      var fakeMessage = {
        id: 123123123,
        text: 'this is only a test',
        user: fakeUsers[0],
        timestamp: new Date().getTime()
      };

      var $el = $(testView._createMessage(fakeMessage));

      assert.equal($el.length, 1);
      assert.equal($el.attr('data-goinstant-id'), fakeMessage.id);
      assert.equal($el.find('.gi-name').html(), fakeMessage.user.displayName);
      assert.equal($el.find('.gi-text').html(), fakeMessage.text);

      var formatted = $el.find('.gi-time').text().split(',')[0];
      assert.isNull(formatted.match('-'));
    });

    it('creates a message with last week\'s time format', function() {
      var fakeMessage = {
        id: 123123123,
        text: 'this is only a test',
        user: fakeUsers[0],
        timestamp: new Date().getTime() - (86400000 * 100)
      };

      var $el = $(testView._createMessage(fakeMessage));

      var formatted = $el.find('.gi-time').text().split(',')[0];
      assert.isNotNull(formatted.match('-'));
    });

    it('creates a message with links', function() {
      // Stub out the $_handleImg method, we dont care about images here.
      testView._validateImage = sinon.stub().yields();

      var fakeMessage = {
        id: 123123123,
        text: 'this is www.google.ca only a http://goinstant.com test',
        user: fakeUsers[0],
        timestamp: new Date().getTime()
      };

      var $el = $(testView._createMessage(fakeMessage));
      var $textContents = $el.find('.gi-text').contents();

      var textType = 3;
      var linkType = 1;

      assert.equal($textContents.length, 5);
      assert.equal($textContents.get(0).nodeType, textType);
      assert.equal($textContents.get(1).nodeType, linkType);
      assert.equal($textContents.get(2).nodeType, textType);
      assert.equal($textContents.get(3).nodeType, linkType);
      assert.equal($textContents.get(4).nodeType, textType);
    });
  });

  describe('pre/append message', function() {
    var $messages;
    var fakeMessage;

    beforeEach(function() {
      testView = new View(mockUserCache, fakeDefaults);
      testView.initialize();
      testView.append();

      $messages = $('.gi-chat .gi-message-list');

      fakeMessage = {
        id: 123123123,
        text: 'this is only a test',
        user: fakeUsers[0],
        timestamp: new Date().getTime()
      };
    });

    afterEach(function() {
      testView.destroy();
    });

    it('appends the message to the view', function() {
      testView.appendMessage(fakeMessage);
      testView.appendMessage(fakeMessage);

      var newFakeMessage = _.clone(fakeMessage);
      newFakeMessage.id = '99999';

      testView.appendMessage(newFakeMessage);

      var $lastMessage = $messages.children().last();
      assert.equal($lastMessage.attr('data-goinstant-id'), newFakeMessage.id);
    });

    it('prepends the message to the view', function() {
      testView.appendMessage(fakeMessage);
      testView.appendMessage(fakeMessage);

      var newFakeMessage = _.clone(fakeMessage);
      newFakeMessage.id = '99999';

      testView.prependMessage(newFakeMessage);

      var $lastMessage = $messages.children().first();
      assert.equal($lastMessage.attr('data-goinstant-id'), newFakeMessage.id);
    });

    it('#prependMessage appends the message if view is empty', function() {
      var newFakeMessage = _.clone(fakeMessage);
      newFakeMessage.id = '99999';

      testView.prependMessage(newFakeMessage);

      var $message = $messages.children().first();

      assert.equal($message.attr('data-goinstant-id'), newFakeMessage.id);
    });
  });

  describe('#_validateImage', function() {
    var fakeImageEl;

    beforeEach(function() {
      testView = new View(mockUserCache, fakeDefaults);
      testView.initialize();

      fakeImageEl = document.createElement('div');
      document.body.appendChild(fakeImageEl);
    });

    afterEach(function() {
      fakeImageEl.parentNode.removeChild(fakeImageEl);
      testView.destroy();
    });

    it('does not add image with invalid URL to DOM', function(done) {
      this.timeout(11000); // Max time the view allows to load image

      var url = 'http://www.goinstant.com/blog';

      testView._validateImage(fakeImageEl, url, function() {

        var img = $(fakeImageEl).children().first();
        assert.equal(img.length, 0);
        done();
      });
    });

    it('adds image with valid URL to DOM', function(done) {
      this.timeout(11000); // Max time the view allows to load image

      var url = 'https://pbs.twimg.com/profile_images/1539812195/400x400-' +
                    'GoInstant_bigger.png';

      testView._validateImage(fakeImageEl, url, function() {

        var img = $(fakeImageEl).children().first();
        assert.equal(img.length, 1);
        assert.equal(img.attr('src'), url);
        done();
      });
    });

    it('adds image that has already been cached', function(done) {
      this.timeout(6000);

      var url = 'https://pbs.twimg.com/profile_images/1539812195/400x400-' +
                    'GoInstant_bigger.png';

      var $images = $(fakeImageEl);
      testView._validateImage(fakeImageEl, url, function() {

        var $imgEls = $images.children();
        assert.equal($imgEls.length, 1);
        assert.equal($imgEls.last().attr('src'), url);

        testView._validateImage(fakeImageEl, url, function() {

          $imgEls = $images.children();
          assert.equal($imgEls.length, 2);
          assert.equal($imgEls.last().attr('src'), url);

          done();
        });
      });
    });
  });

  describe('url regex', function() {
    beforeEach(function() {
      testView = new View(mockUserCache, fakeDefaults);
      testView.initialize();
    });

    afterEach(function() {
      testView.destroy();
    });

    it('matches valid URLS', function() {
      // Valid URLS = 40
      var validUrls = [
        'www.goinstant.com',
        'http://goinstant.com',
        'https://www.goinstant.com',
        'http://www.goinstant.com/blog',
        'http://www.google.ca',
        'https://pbs.twimg.com/profile_images/1539812195/400x400-GoInstant_bigger.png',
        'http://www.plactual.com/?p=155',
        'http://www.mfz8.net/archives/103.html',
        'http://dnev.lg.ua/czar/2009/06/29/%D0%BA%D0%BE%D1%80%D0%BE%D0%BB%D1%8C-%D1%83%D1%88%D0%B5%D0%BB-%D0%BC%D0%B0%D0%B9%D0%BA%D0%BB-%D0%B4%D0%B6%D0%BE%D0%B7%D0%B5%D1%84-%D0%B4%D0%B6%D0%B5%D0%BA%D1%81%D0%BE%D0%BD-%D1%83%D0%BC%D0%B5%D1%80',
        'http://www.holzerian.com/blog/2010/09/12/food-blog-forum-atlanta',
        'http://imbensmith.com/WP/weather-update-with-the-side-of-jerk',
        'http://delicatbiz.com/en/?p=12923',
        'http://imbensmith.com/WP/snoop-denied',
        'http://www.ipadcomputerstore.com/?p=513',
        'http://www.astreetjournalist.com/2010/01/18/urge-iranian-authorities-immediately-halt-execution-of-sarymeh-ebadi-boali-johnfeshani-by-stoning',
        'http://karaworld.little-pluto.hu/?page_id=13',
        'http://216.35.217.92/?attachment_id=264',
        'http://www.ipadcomputerstore.com/?p=624',
        'http://lilyfan.net/wp/2011/10/nmes-150-best-tracks-of-the-past-15-years',
        'http://hackersi.altervista.org/?p=376',
        'http://crowdpleazas.com/?p=165',
        'http://www.ipadcomputerstore.com/?p=674',
        'http://imbensmith.com/WP/bombshell-mcgees-take-on-jesse-james-nightline-interview',
        'http://www.ipadcomputerstore.com/?p=775',
        'http://www.ipadcomputerstore.com/?p=706',
        'http://sandlotter.hp2.jp/%E4%BB%8A%E6%97%A5%E3%81%AE%E3%81%A8%E3%82%82%E3%81%B2%E3%82%8D%E6%97%A5%E8%A8%98/%E3%82%A8%E3%83%BC%E3%82%B9%E3%81%AE%E4%B8%8A%E9%81%94%EF%BC%9F',
        'http://www.abirdtold.me/?attachment_id=1036',
        'http://hackersi.altervista.org/?p=448',
        'http://dnev.lg.ua/9263/2009/06/01/%D0%B7%D0%B0%D0%B3%D0%B0%D0%B4%D0%BA%D0%B0',
        'http://www.abirdtold.me/?attachment_id=1360',
        'http://www.ipadcomputerstore.com/?p=757',
        'http://www.ipadcomputerstore.com/?p=778',
        'http://dnev.lg.ua/9263/2009/05/12/%D0%BF%D0%BB%D0%BE%D1%85%D0%BE',
        'http://lilyfan.net/wp/2009/06/vote-for-lily-on-20minutes-spain',
        'http://www.abirdtold.me/?attachment_id=1687',
        'http://dnev.lg.ua/9263/2009/03/13/%D1%83%D1%84%D1%84%D1%84%D1%8A',
        'http://3rosnah.ads4blog.net/daily-bop-sessions',
        'http://www.gonikeblazers.com/blog/running-shoes-nike-free-run-2',
        'http://www.gonikeblazers.com/blog/multi-angle-attack-released-2011-nike-all-star-color-shoes',
        'http://karaworld.little-pluto.hu/?page_id=57'
      ];

      var invalidUrls = [
        // Invalid URLS = 5
        'im a cat',
        'i!@#!@#JHK@M!SAFAF$%^&*()!@)__)!@#)*',
        'what asdahkd asdhjale 1231 jka dasd ',
        '                  ',
        'asd78jk,msdm aasda asd12!....'
      ];

      var allUrls = validUrls.concat(invalidUrls);

      var result = 0;
      var expected = validUrls.length;

      _.each(allUrls, function(url) {
        if (url.match(testView._urlRegex)) {
          result++;
        }
      });

      assert.equal(result, expected);
    });
  });

  describe('#destroy', function() {
    beforeEach(function() {
      testView = new View(mockUserCache, fakeDefaults);
      testView.initialize();
    });

    it('removes the chat widget from the DOM', function() {
      testView.destroy();

      var $chat = $('.gi-chat');
      assert.equal($chat.length, 0);
    });
  });

});
