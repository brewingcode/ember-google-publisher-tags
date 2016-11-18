# ember-google-publisher-tags

[![npm version](https://badge.fury.io/js/ember-google-publisher-tags.svg)](https://badge.fury.io/js/ember-google-publisher-tags)

An Ember component for adding [GPT](https://support.google.com/dfp_sb/answer/1649768?hl=en)
ads to your site.

## Usage

```hbs
{{google-publisher-tag adId="/6355419/Travel/Europe/France/Paris" width=300 height=250}}
```

The `adId` is taken straight from DFP's "Generate Tags" link. The above is a
sample ad on Google's ad network.

Optional properties:

* `placement=N`: Differentiate ads that use the same `adId` on a single page.
  For example, one ad might be `placement="upper right"`, while another might be
  `placement="lower left"`.

* `refresh=N`: Refresh the ad after `N` seconds. Each refresh also increments
  the `refreshCount` property, which might be useful.

* `refreshLimit=N` Limit refreshing to `N` times. For example, setting to 5 would
  stop refreshing after the 5th time.

* `tracing=true`: Turn on `Ember.Logger.log` tracing.

* `shouldWatchViewport=false`: Turn off checks for ad in view, if using tons of
  ads slows down your page.

* `backgroundRefresh=true`: By default, we do not refresh ads in backgrounded pages,
  according to the `document.hidden` property. If, for some strange reason, you
  want to refresh ads while nobody is looking, set this to true.

Additionally, if you want to use GPT's `setTargeting` function to serve targeted
ads, extend the `GooglePublisherTag` component and override the `addTargeting`
function in your child component. Inside this function, set the `targeting`
property to an object:

```js
// components/your-ad.js
import GPT from 'ember-google-publisher-tags/components/google-publisher-tag';

export default GPT.extend({
    tracing: true, // useful for development, especially if it's computed

    addTargeting() {
        set(this, 'targeting', {
            placement: get(this, 'placement'),
            refresh_count: get(this, 'refreshCount'),
            planet: 'Earth'
        });
    }
};
```

```hbs
<!-- application.hbs -->
{{your-ad adId="..." width=300 height=250}}
```

## Installation

1. `ember install ember-google-publisher-tags`

2. If your app uses Ember's default `index.html`, no further installation is needed: this
  addon uses Ember's `head-footer` hook to insert the GPT initialization code into your
  page `<head>`s (unless you use `iframeJail`, see below).

3. If #2 does not apply to you, you'll have to manually add the GPT initialization
  `<script>` tag to your page `<head>`. Copy it from either [index.js](index.js) or
  [gpt-iframe.html](public/gpt-iframe.html), and paste it wherever you need to
  in your app's structure.

## Configuration

### gpt.iframeJail: boolean (default: false)

By default, GPT runs in your page's window. Since ads do all sorts of
malicious crap, you can have the ads run inside an `<iframe>` jail of their
very own. This addon comes with its own [gpt-iframe.html](public/gpt-iframe.html) file
for exactly this purpose. Set this property to `true` to:

1. Put all GPT javascript inside its own `<iframe>`

2. *disable* the `head-footer` hook for this addon, so that your page `<head>` is
unaffected

### gpt.iframeRootUrl: string (default: "")

If your `dist` folder is not accessible at the root of your domain, or if you need to
put the `gpt-iframe.html` file somewhere else, use this property. It will be prepended
to the `src` attribute of the iframe, which is `/gpt-iframe.html` by default.

```js
// config/environment.js

module.exports = function(environment) {
    var ENV = {
        gpt: {
            // your config settings
            iframeJail: true,
            iframeRootUrl: '/somewhere/else'
        }
    };
```

## Troubleshooting

1. Make sure your ad blocker isn't interfering.

2. Set `tracing` to true, and follow what the addon does in your browser's console.

3. Add `googfc` as a query parameter to your url, this will activate an in-page
debugging console. Eg, `http://localhost:4200/?googfc`. [More info here](https://support.google.com/dfp_sb/answer/181070?hl=en).

## Docs

* [GPT Boilerplate (annotated)](https://support.google.com/dfp_premium/answer/1638622?hl=en&ref_topic=4389931)
* [GPT Reference](https://developers.google.com/doubleclick-gpt/reference)
* [Ad Sizes](https://support.google.com/adsense/answer/185666)
* [Common Mistakes](https://developers.google.com/doubleclick-gpt/common_implementation_mistakes)
