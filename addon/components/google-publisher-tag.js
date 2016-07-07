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
//    - tracing: verbose messages in console.log via Ember.Logger.log

import Ember from 'ember';
import {task, timeout} from 'ember-concurrency';

const {
    assert, get, set, getProperties, Component,
    String: { htmlSafe, dasherize },
    Logger: { log }
} = Ember;

export default Component.extend({
    classNames: ['gpt-ad'],
    attributeBindings: ['style'],

    placement: 0,
    refresh: 0,
    tracing: false,

    didInitAttrs() {
        this._super(...arguments);

        let {adId, width, height, placement} = getProperties(this, 'adId', 'width', 'height', 'placement');

        // width and height are also passed into .defineSlot(), which will
        // silently fail unless they are actually numbers
        assert(`google-publisher-tag "${adId} (${placement})k": width and height must be numbers`, typeof width === 'number' && typeof height === 'number');

        let style = `width:${width}px; height:${height}px;`;
        set(this, 'style', htmlSafe(style));

        // strip off optional leading slash, and then strip off everything up to
        // the first slash
        let elementId = adId.replace(/^\/?[^\/]+\//, '');
        set(this, 'elementId', dasherize(`${elementId}-${placement}`));
    },
    didInsertElement() {
        this._super(...arguments);

        let googletag = window.googletag;
        let {adId, width, height, elementId} = getProperties(this, 'adId', 'width', 'height', 'elementId');
        googletag.cmd.push( () => {
            this.trace(`defining slot ${adId} for div ${elementId}`);
            let slot = googletag.defineSlot(adId, [width, height], elementId)
                .addService(googletag.pubads());
            this.addTargeting(slot);
            googletag.enableServices();
            googletag.display(elementId);
            set(this, 'slot', slot);
            this.waitForRefresh();
        });
    },

    addTargeting(slot) { // jshint ignore:line
        // override this in child components, if needed, but an example is:
        // slot.setTargeting('planet', 'Earth');
    },
    waitForRefresh() {
        let duration = get(this, 'refresh');
        if (duration > 0) {
            this.trace(`will refresh in ${duration} seconds`);
            get(this, 'doRefresh').perform(duration);
        }
    },
    trace() {
        if (get(this, 'tracing')) {
            log(`${get(this, 'elementId')}: `, ...arguments);
        }
    },

    doRefresh: task(function * (duration) {
        yield timeout(duration * 1000);
        let googletag = window.googletag;
        googletag.cmd.push( () => {
            this.trace('refreshing now');
            let slot = get(this, 'slot');
            this.addTargeting(slot);
            googletag.pubads().refresh([slot]);
            this.waitForRefresh();
        });
    }).restartable()
});
