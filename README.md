# ember-google-publisher-tags

An Ember component for adding [GPT](https://support.google.com/dfp_sb/answer/1649768?hl=en)
ads to your site.

## Usage

```hbs
{{google-publisher-tag adId="/6355419/Travel/Europe/France/Paris" width=300 height=250}}
```

The `adId` is taken straight from DFP's "Generate Tags" link. The above is a
sample ad on Google's ad network.

Optional properties:

* `refresh=N`: Refresh the ad after `N` seconds.
* `placement=N`: Differentiate ads that use the same `adId` on a single page.
For example, one ad might be `placement="upper right"`, while another might be
`placement="lower left"`.
* `tracing=true`: Turn on `Ember.Logger.log` tracing.

Additionally, if you want to use GPT's `setTargeting` function to serve targeted
ads, extend the `GooglePublisherTag` component and override the `addTargeting`
function in your child component:

```js
// components/your-ad.js
import GPT from 'ember-google-publisher-tags/components/google-publisher-tag';

export default GPT.extend({
    tracing: true, // useful for development, especially if it's computed

    addTargeting(slot) {
        slot.setTargeting('age', '100');
        // ... more targeting, if desired
    }
};
```

```hbs
<!-- application.hbs -->
{{your-ad adId="..." width=300 height=250}}
```

## Installation

1. `ember install Ember-google-publisher-tags`

2. Add the following initialization boilerplate to your `<head>`:

```js
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
```

## Docs

* [GPT Boilerplate (annotated)](https://support.google.com/dfp_premium/answer/1638622?hl=en&ref_topic=4389931)
* [GPT Reference](https://developers.google.com/doubleclick-gpt/reference)
* [Ad Sizes](https://support.google.com/adsense/answer/185666)
