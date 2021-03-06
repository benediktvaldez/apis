var request = require('request');
var app = require('../../server');
var cheerio = require('cheerio');
var _ = require('underscore');
var h = require('apis-helpers');

var getParamFromURL = function(url, param) {
  // This feels wrong.
  var params = url.split('?')[1].split('&');

  for (var p in params) {
    var pieces = params[p].split('=');
    if (pieces[0] === param) {
      return pieces[1];
    }
  }
  throw 'Key not found in query parameters';
};

app.get('/golf/teetimes', function(req, res) {
  var clubId = req.query.club;
  if(!clubId) {
    return res.status(431).json({error: 'Please provide a valid club id to lookup'});
  }

  request.get({
    rejectUnauthorized: false, // http://stackoverflow.com/a/20091919
    headers: {'User-Agent': h.browser()},
    url: 'http://mitt.golf.is/pages/rastimar/rastimayfirlit/?club=' + clubId
  }, function(err, response, html) {
    if(err || response.statusCode !== 200) {
      return res.status(500).json({error: 'mitt.golf.is refuses to respond or give back data'});
    }
    var $ = cheerio.load(html);
    var rows = $('table.teeTimeTable tbody').children();
    var time = '';
    return res.cache().json({ results: _.map(rows, function(row) {
      var row = $(row);
      time = row.children('td.time').html() === null ? time : row.children('td.time').html();
      return {
        time: time,
        name: $(row.children('td.name')).html(),
        club: $(row.children('td.club')).html(),
        handicap: $(row.children('td.handicap')).html()
      };
    })});
  });
});

app.get('/golf/clubs', function(req, res) {
  request.get({
    rejectUnauthorized: false, // http://stackoverflow.com/a/20091919
    headers: {'User-Agent': h.browser()},
    url: 'http://mitt.golf.is/pages/rastimar/'
  }, function(err, response, html) {
    if(err || response.statusCode !== 200)
      return res.status(500).json({error: 'mitt.golf.is refuses to respond or give back data'});

    var $ = cheerio.load(html);
    var rows = $('table.golfTable tr').slice(2); // Skip the first element.
    return res.cache(3600).json({ results: _.map(rows, function(row) {
      var row = $(row);
      return {
        abbreviation: row.children('td.abbreviation').html(),
        club: {
          id: getParamFromURL(row.children('td.club').children('a').attr('href'), 'club'),
          name: row.children('td.club').children('a').html()
        },
        location: row.children('td.location').html()
      };
    })});
  });
});
