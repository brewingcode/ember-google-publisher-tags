// for Google Publisher Tag ads
//
// required props:
//    - adId: eg, '/6355419/Travel/Europe/France/Paris'
//    - height: a css size in pixels
//    - width: ditto
//
// See README for optional/user-facing properties.
/* globals $ */

import Ember from 'ember';
import InViewportMixin from 'ember-in-viewport';
import getViewportTolerance from '../utils/get-viewport-tolerance';
import config from 'ember-get-config';

const {
    Component, assert, get, set, getProperties, setProperties, observer,
    String: { htmlSafe },
    Logger: { log },
    run: { later },
    inject: { service },
} = Ember;

function safeSet(obj, ...args) {
    if (obj && !get(obj, 'isDestroyed') && !get(obj, 'isDestroying')) {
        set(obj, ...args);
    }
}

export default Component.extend(InViewportMixin, {
    classNames: ['google-publisher-tag'],
    attributeBindings: ['style'],
    refreshCount: 0,
    slot: null,
    adQueue: service(),
    targeting: {},
    iframeUrl: null,

    // user-facing properties
    placement: 0,
    refresh: 0,
    refreshLimit: 0,
    tracing: false,
    shouldWatchViewport: true,
    backgroundRefresh: false,

    didReceiveAttrs() {
        this._super(...arguments);

        if (config.gpt && config.gpt.iframeJail)  {
            let rootUrl = config.gpt.iframeRootUrl || config.rootURL;
            set(this, 'iframeUrl', `${rootUrl}gpt-iframe.html`);
        }

        let {adId, width, height, placement} = getProperties(this, 'adId', 'width', 'height', 'placement');

        // width and height are also passed into .defineSlot(), which will
        // silently fail unless they are actually numbers
        assert(`google-publisher-tag "${adId} (${placement})": width and height must be numbers`, typeof width === 'number' && typeof height === 'number');

        let style = `width:${width}px; height:${height}px;`;
        set(this, 'style', htmlSafe(style));
    },

    didInsertElement() {
        this.viewportSetup();
        // we must call viewportSetup() first before calling ._super()
        // where the ember-in-viewport mixin consumes the properties
        this._super(...arguments);

        this.backgroundSetup();
        this.refreshSetup();
    },

    viewportSetup() {
        let { shouldWatchViewport, width, height } =
            getProperties(this, 'shouldWatchViewport', 'width', 'height');

        if (shouldWatchViewport) {
            setProperties(this, {
                viewportEnabled: shouldWatchViewport,
                viewportSpy: true,
                viewportTolerance: getViewportTolerance(width, height, 0.5)
            });
            set(this, 'inViewport', false);
        }
        else {
            // since enter/exit hooks won't be fired, `inViewport` will never change. So,
            // we set this to true here now and forever
            set(this, 'inViewport', true);
        }
    },

    backgroundSetup() {
        if (get(this, 'backgroundRefresh')) {
            // since we're not going to hook the visibilitychange event, set this manually
            set(this, 'inForeground', true);
        }
        else {
            set(this, 'inForeground', !document.hidden);
            if (document && document.addEventListener) {
                document.addEventListener('visibilitychange', () => {
                    this.trace('visibilitychange: document.hidden: ', document.hidden);
                    safeSet(this, 'inForeground', !document.hidden);
                });
            }
        }
    },

    refreshSetup() {
        // for setup, we always set this to true to initialize the ad the first time
        set(this, 'isRefreshDue', true);
    },

    // This is the meat of this component: any time one of these 3 properties is .set(), we need
    // to check if a refresh should be triggered. A refresh is triggered ONLY if all 3 properties
    // are true.
    triggerRefresh: observer('inViewport', 'isRefreshDue', 'inForeground', function() {
        let count = 0;
        ['inViewport', 'isRefreshDue', 'inForeground'].forEach( prop => {
            if (get(this, prop)) {
                count++;
            }
        });
        if (count === 3) {
            this.doRefresh();
            this.waitForRefresh();
        }
        else {
            this.trace(`skipping refresh with count ${count}`);
        }
    }),

    doRefresh() {
        if (!get(this, 'isDestroying') && !get(this, 'isDestroyed')) {
            this.incrementProperty('refreshCount');
        }
        let { refreshCount, refreshLimit } = getProperties(this, 'refreshCount', 'refreshLimit');
        this.trace(`refreshing now: ${refreshCount} of ${refreshLimit}`);
        this.addTargeting();

        if (get(this, 'iframeUrl')) {
            this.buildIframeJail();
        }
        else {
            let slot = get(this, 'slot');
            let googletag = window.googletag;
            if (slot && googletag && googletag.cmd) {
                googletag.cmd.push( () => {
                    googletag.pubads().refresh([slot]);
                });
            }
            else {
                get(this, 'adQueue').push(this);
            }
        }
    },

    buildIframeJail() {
        let { iframeUrl, width, height, adId, targeting } =
            getProperties(this, 'iframeUrl', 'width', 'height', 'adId', 'targeting');
        let iframeExternalUrl = config.gpt && config.gpt.iframeExternalUrl;

        let adParams = { adId, width, height };
        let targetingParams = Object.keys(targeting).map( k => {
            return [ k, targeting[k] ];
        });

        let finalUrl = iframeUrl;
        if (iframeExternalUrl) {
            finalUrl = iframeExternalUrl + encodeURIComponent(JSON.stringify({
                ad: adParams,
                targeting: targetingParams,
            }));
        }
        this.$().prepend(`<iframe style="display:none; width:${width}px; height:${height}px" frameBorder="0" src="${finalUrl}"></iframe>`);

        let frames = this.$('iframe');
        let newAd = frames.get(0);
        let existingAds = frames.length > 1 ? frames.slice(1) : this.$([]);

        this.$(newAd).on('load', () => {
            let elementId = get(this, 'elementId');
            this.trace(`passing info to iframe in ${elementId} for ${adId}: `, targetingParams);

            if (!iframeExternalUrl) {
                newAd.contentWindow.ad = adParams;
                newAd.contentWindow.targeting = targetingParams;
                newAd.contentWindow.startCallingGpt = true;
            }

            later(this, () => {
                existingAds.each( (index, node) => {
                    $(node).remove();
                });
                this.$(newAd).show();
            }, 500);
        });
    },

    addTargeting() {
        // override this in child components, if needed, but an example is:
        // set(this, 'targeting', {
        //     placement: get(this, 'placement'),
        //     refresh_count: get(this, 'refreshCount'),
        //     planet: 'Earth'
        // });
    },

    waitForRefresh() {
        safeSet(this, 'isRefreshDue', false);

        let refreshInterval = get(this, 'refresh');
        if (refreshInterval <= 0) {
            this.trace('refresh is disabled');
            return;
        }

        let {refreshLimit, refreshCount} = getProperties(this, 'refreshLimit', 'refreshCount');
        if (refreshLimit > 0 && refreshCount >= refreshLimit) {
            this.trace(`refreshCount has met refreshLimit: ${refreshLimit}`);
            return;
        }

        this.trace(`waiting for ${refreshInterval} seconds to refresh`);
        later(this, () => {
            this.trace('refresh is due');
            safeSet(this, 'isRefreshDue', true);
        }, 1000 * refreshInterval);
    },

    trace() {
        if (get(this, 'tracing')) {
            let {adId, placement} = getProperties(this, 'adId', 'placement');
            log(`${adId} (${placement}):`, ...arguments);
        }
    },

    didEnterViewport() {
        this.trace('entered viewport');
        safeSet(this, 'inViewport', true);
    },

    didExitViewport() {
        this.trace('exited viewport');
        safeSet(this, 'inViewport', false);
    },

});
