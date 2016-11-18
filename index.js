/* jshint node: true */
'use strict';

var Funnel = require('broccoli-funnel');
var mergeTrees = require('broccoli-merge-trees');

module.exports = {
  name: 'ember-google-publisher-tags',

  contentFor: function(type, config) {
    if (type === 'head-footer' && !this.app.options.gptIframeJail) {
      return `
<script type='text/javascript'>
  var googletag = googletag || {};
  googletag.cmd = googletag.cmd || [];
  (function() {
    var gads = document.createElement('script');
    gads.async = true;
    gads.type = 'text/javascript';
    var useSSL = 'https:' == document.location.protocol;
    gads.src = (useSSL ? 'https:' : 'http:') +
      '//www.googletagservices.com/tag/js/gpt.js';
    var node = document.getElementsByTagName('script')[0];
    node.parentNode.insertBefore(gads, node);
  })();
</script>
      `;
    }
  },

  config: function(env, config) {
    if (this.app) {
      // TODO: `this.app` check is necessary for "ember serve", but not "ember build": why?
      this.app.options.gptIframeJail = config.gptIframeJail;
    }
  },

  treeForPublic: function(tree) {
    if (this.app.options.gptIframeJail) {
      var assetsTree = new Funnel('public');
      return mergeTrees([tree, assetsTree], {
        overwrite: true
      });
    }
  }
};
