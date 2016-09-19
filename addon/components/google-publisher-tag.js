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
    refreshLimit: false,
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
        this._super(...arguments);

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
        this.incrementProperty('refreshCount');

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

    canRefresh() {
      let isWithinLimits = get(this, 'refreshLimit') >= get(this, 'refreshCount');
      return this.isRefreshLimited() && isWithinLimits;
    },

    doRefresh() {

        if (this.canRefresh()) {

          // log helpful data when refresh is limited
          if (this.isRefreshLimited()) {
            this.trace(`refreshed ${get(this, 'refreshCount')} of ${get(this, 'refreshLimit')} times`);
          }

          let googletag = window.googletag;
          googletag.cmd.push( () => {
            let slot = get(this, 'slot');
            this.trace('refreshing now');
            this.addTargeting(slot);
            googletag.pubads().refresh([slot]);
            this.waitForRefresh();
          });

        } else {
          this.trace('can not refresh slot');
        }
    },

    isRefreshLimited() {
      return get(this, 'refreshLimit') !== false;
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
