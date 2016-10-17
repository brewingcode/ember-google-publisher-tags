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
    inject: { service },
    run: { scheduleOnce }
} = Ember;

export default Component.extend(InViewportMixin, {
    classNames: ['google-publisher-tag'],
    attributeBindings: ['style'],

    adQueue: service(),

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
        let {
          shouldWatchViewport,
          width,
          height
        } = getProperties(this,
          'shouldWatchViewport',
          'width',
          'height'
        );

        setProperties(this, {
          viewportEnabled: shouldWatchViewport,
          viewportSpy: true,
          viewportTolerance: getViewportTolerance(width, height, 0.5)
        });

        // we must set the properties above first before calling super
        // where the mixin consumes the properties
        this._super(...arguments);

        if (!shouldWatchViewport) {
          scheduleOnce('afterRender', () => {
            this.initAd();
          });
        } else {
            // watch via this.didEnterViewport(), below
            this.trace('watching viewport, waiting for event...');
        }

        if (!get(this, 'backgroundRefresh')) {
            if (document && document.addEventListener) {
                document.addEventListener('visibilitychange', () => {
                    this.trace('visibilitychange: document.hidden: ', document.hidden);
                    if (!document.hidden) {
                        this.didEnterViewport();
                    }
                }, false);
            }
        }
    },

    initAd() {
      if (!get(this, 'isAdInitialized')) {
        this.trace('initializing');
        get(this, 'adQueue').push(this);
        set(this, 'isAdInitialized', true);
      }

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

      let text = `refreshing now: ${refreshCount}`;
      if (refreshLimit > 0) {
        text += ` of ${refreshLimit}`;
      }

      this.trace(text);
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
