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

* `refreshLimit=N` Limit refreshing to `N` times. For example, setting to 5 would stop refreshing after the 5th time.

* `tracing=true`: Turn on `Ember.Logger.log` tracing.

* `shouldWatchViewport=false`: Turn off checks for ad in view, if using tons of
  ads slows down your page.

* `backgroundRefresh=true`: By default, we do not refresh ads in backgrounded pages,
  according to the `document.hidden` property. If, for some strange reason, you
  want to refresh ads while nobody is looking, set this to true.

* `iframeJail=URL`: By default, GPT runs in your page's window. Since ads do all sorts
  of malicious crap, you can have the ads run inside an \<iframe> of their very own.
  Pass in a url that points to a page on your domain to serve ads in, and copy the
  [example .html file](tests/dummy/public/ad-iframe.html) file to this location.

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
  addon hooks into Ember's `head-footer` generation.

3. If you are using `iframeJail`, your iframe's HTML will need to look a certain way:
  copy the [example .html file](tests/dummy/public/ad-iframe.html) to get started.
  This file includes this GPT initialization boilerplate.

4. If neither #2 or #3 apply to you, you'll have to manually add the GPT initialization
  \<script> tag to your page \<head>. Copy it from either [index.html](index.html) or
  [ad-iframe.html](tests/dummy/public/ad-iframe.html), and paste it wherever you need to
  in your app's structure.

## Troubleshooting

1. Make sure your ad blocker isn't interfering.

2. Add `googfc` as a query parameter to your url, this will activate an in-page
debugging console. Eg, `http://localhost:4200/?googfc`. [More info here](https://support.google.com/dfp_sb/answer/181070?hl=en).

## Docs

* [GPT Boilerplate (annotated)](https://support.google.com/dfp_premium/answer/1638622?hl=en&ref_topic=4389931)
* [GPT Reference](https://developers.google.com/doubleclick-gpt/reference)
* [Ad Sizes](https://support.google.com/adsense/answer/185666)
* [Common Mistakes](https://developers.google.com/doubleclick-gpt/common_implementation_mistakes)
