// for Google Publisher Tag ads
//
// required props:
//    - adId: eg, '/6355419/Travel/Europe/France/Paris'
//    - height: a css size in pixels
//    - width: ditto
//
// optional props:
//    - placement: only useful if the same `adId` is used more than once on a
//      page, use this to distinguish between them: call one "1" and the other
//      "2", or call them "top-left" and "bottom-right", etc
//    - refresh: number of seconds between refreshes
//    - shouldWatchViewport: turn off checks for ad in view
//    - tracing: verbose messages in console.log via Ember.Logger.log
//    - backgroundRefresh: refresh ads when tabs in are backgrounded

import Ember from 'ember';
import {task, timeout} from 'ember-concurrency';
import InViewportMixin from 'ember-in-viewport';
import getViewportTolerance from '../utils/get-viewport-tolerance';

const {
    Component, assert, get, set, getProperties, setProperties, run,
    String: { htmlSafe },
    Logger: { log },
    run: { scheduleOnce }
} = Ember;

export default Component.extend(InViewportMixin, {
    classNames: ['google-publisher-tag'],
    attributeBindings: ['style'],

    placement: 0,
    refresh: 0,
    refreshCount: 0,
    refreshLimit: 0,
    tracing: false,
    shouldWatchViewport: true,

    didReceiveAttrs() {
        this._super(...arguments);

        let {adId, width, height, placement} = getProperties(this, 'adId', 'width', 'height', 'placement');

        // width and height are also passed into .defineSlot(), which will
        // silently fail unless they are actually numbers
        assert(`google-publisher-tag "${adId} (${placement})": width and height must be numbers`, typeof width === 'number' && typeof height === 'number');

        let style = `width:${width}px; height:${height}px;`;
        set(this, 'style', htmlSafe(style));
    },

    didInsertElement() {
        this.viewportSetup();
        // we must call viewportSetup() first before calling super
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
                    set(this, 'inForeground', !document.hidden);
                });
            }
        }
    },

    refreshSetup() {
        // for setup, we always set this to true to initialize the ad the first time
        set(this, 'isRefreshDue', true);
    },

        let duration = get(this, 'refresh');
            if (duration > 0) {
            this.waitForRefresh();
        }
    },

    addTargeting(/* slot */) {
        // override this in child components, if needed, but an example is:
        // slot.setTargeting('placement', get(this, 'placement'));
        // slot.setTargeting('refresh_count', get(this, 'refreshCount'));
        // slot.setTargeting('planet', 'Earth');
    },
    waitForRefresh() {
        let {refreshLimit, refreshCount} = getProperties(this, 'refreshLimit', 'refreshCount');
        if (refreshLimit > 0 && refreshCount >= refreshLimit) {
            this.trace(`refreshCount has met refreshLimit: ${refreshLimit}`);
          return;
        }

        // give the tests a moment to release wait handlers
        setTimeout(() => {
            run(() => {
                get(this, 'refreshWaitTask').perform();
            });
        });
    },
    trace() {
        if (get(this, 'tracing')) {
            let {adId, placement} = getProperties(this, 'adId', 'placement');
            log(`${adId} (${placement}):`, ...arguments);
        }
    },

    refreshWaitTask: task(function * () {
        let duration = get(this, 'refresh');

        this.trace(`will refresh in ${duration} seconds`);

        yield timeout(duration * 1000);

        let {
            shouldWatchViewport,
            viewportEntered
        } = getProperties(this,
            'shouldWatchViewport',
            'viewportEntered'
        );

        if (shouldWatchViewport && !viewportEntered) {
            this.trace('ad not in view, delaying refresh');
            set(this, 'isRefreshOverdue', true);
            return;
        }

        if (!get(this, 'backgroundRefresh') && document.hidden) {
            this.trace('ad is in background, delaying refresh');
            set(this, 'isRefreshOverdue', true);
            return;
        }

        this.doRefresh();
    }).drop(), // don't reset the timer if you scroll out and back in view before it finishes

    doRefresh() {
        let googletag = window.googletag;
        googletag.cmd.push( () => {
            this.incrementProperty('refreshCount');
            this.traceRefresh();

            let slot = get(this, 'slot');
            this.addTargeting(slot);
            googletag.pubads().refresh([slot]);

            this.waitForRefresh();
        });
    },

    traceRefresh() {
        let { refreshCount, refreshLimit } = getProperties(this, 'refreshCount', 'refreshLimit');
        this.trace(`refreshing now: ${refreshCount} of ${refreshLimit}`);
    },

    didEnterViewport() {
        this.trace('entered viewport');
        this.initAd();
        if (get(this, 'isRefreshOverdue')) {
            this.doRefresh();
            set(this, 'isRefreshOverdue', false);
        }
    }
});
