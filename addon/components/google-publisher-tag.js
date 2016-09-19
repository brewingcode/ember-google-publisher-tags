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

import Ember from 'ember';
import {task, timeout} from 'ember-concurrency';
import InViewportMixin from 'ember-in-viewport';
import getViewportTolerance from '../utils/get-viewport-tolerance';

const {
    Component,
    assert,
    get, set, getProperties, setProperties,
    String: { htmlSafe },
    Logger: { log },
    inject: { service },
    run,
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
          viewportEntered,
          width,
          height
        } = getProperties(this,
          'shouldWatchViewport',
          'viewportEntered',
          'width',
          'height'
        );

        setProperties(this, {
          viewportEnabled: shouldWatchViewport,
          viewportSpy: true,
          viewportTolerance: getViewportTolerance(width, height, 0.5)
        });

        scheduleOnce('afterRender', () => {
          if (!shouldWatchViewport || viewportEntered) {
            this.initAd();
          } else {
            this.trace('ad hidden on load, not initialized');
          }
        });

        // we must set the properties above first before calling super
        // where the mixin consumes the properties
        this._super(...arguments);
    },

    initAd() {
      if (!get(this, 'isAdInitialized')) {
        this.trace('initializing');
        get(this, 'adQueue').push(this);
        set(this, 'isAdInitialized', true);
      }
      this.waitForRefresh();
    },

    addTargeting(slot) { // jshint ignore:line
        // override this in child components, if needed, but an example is:
        // slot.setTargeting('placement', get(this, 'placement'));
        // slot.setTargeting('refresh_count', get(this, 'refreshCount'));
        // slot.setTargeting('planet', 'Earth');
    },
    waitForRefresh() {
        let duration = get(this, 'refresh');
        if (duration > 0) {
            this.trace(`will refresh in ${duration} seconds`);

            // give the tests a moment to release wait handlers
            setTimeout(() => {
              run(() => {
                get(this, 'refreshWaitTask').perform(duration);
              });
            });
        }
    },
    trace() {
        if (get(this, 'tracing')) {
            let {adId, placement} = getProperties(this, 'adId', 'placement');
            log(`${adId} (${placement}): `, ...arguments);
        }
    },

    refreshWaitTask: task(function * (duration) {
        yield timeout(duration * 1000);

        let {
          shouldWatchViewport,
          viewportEntered
        } = getProperties(this,
          'shouldWatchViewport',
          'viewportEntered'
        );

        if (shouldWatchViewport && !viewportEntered) {
          this.trace('ad not in view, skipped refresh');

          return set(this, 'isRefreshOverdue', true);
        }

        this.doRefresh();
    }).restartable(),

    doRefresh() {
        let {refreshLimit, refreshCount} = getProperties(this, 'refreshLimit', 'refreshCount');
        if (refreshLimit > 0 && refreshCount >= refreshLimit) {
          this.trace(`refreshCount has exceeded refreshLimit: ${refreshLimit}`);
          return;
        }

        this.trace(`queuing a refresh: ${refreshCount}`);
        let googletag = window.googletag;
        googletag.cmd.push( () => {
          let slot = get(this, 'slot');
          this.trace('refreshing now');
          this.addTargeting(slot);
          googletag.pubads().refresh([slot]);
          this.incrementProperty('refreshCount');
          this.waitForRefresh();
        });
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
