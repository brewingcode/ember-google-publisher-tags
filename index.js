/* jshint node: true */
'use strict';

module.exports = {
  name: 'ember-google-publisher-tags',

  contentFor: function(type, config) {
    if (type === 'head-footer' && !this.gptIframeJail) {
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
    this.gptIframeJail = config.gpt && config.gpt.iframeJail;
  },

  treeForPublic: function(tree) {
    if (this.gptIframeJail) {
      return tree;
    }
  }
};
