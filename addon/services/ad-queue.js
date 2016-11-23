import Ember from 'ember';
import {task, timeout} from 'ember-concurrency';

const {
  A: newArray,
  on
} = Ember;

export default Ember.Service.extend({
    queue: newArray(),
    tracing: false,

    onInit: on('init', function() {
        this.get('loadGPT').perform(0);
    }),

    push(component) {
        if (component.get('tracing')) {
            this.set('tracing', true);
        }

        this.trace(`adding: ${component.get('adId')}`);

        this.get('queue').pushObject(component.get('elementId'));

        this._pushCmd(googletag => {
            let {adId, width, height, elementId} = component.getProperties('adId', 'width', 'height', 'elementId');
            this.trace(`defining slot: ${adId} @ ${width}x${height} in ${elementId}`);
            let slot = googletag.defineSlot(adId, [width, height], elementId)
                .addService(googletag.pubads());
            component.set('slot', slot);

            component.addTargeting();
            let targeting = component.get('targeting');
            Object.keys(targeting).forEach( k => {
                slot.setTargeting(k, targeting[k]);
            });
        });

        this.get('displayAll').perform(1000);
    },

    loadGPT: task(function * (delay) {
        yield timeout(delay);

        this._pushCmd(googletag => {
            this.trace('enableSingleRequest: ', googletag.pubads().enableSingleRequest());
            this.trace('enableServices: ', googletag.enableServices());
        });
    }).restartable(),

    displayAll: task(function * (delay) {
        yield timeout(delay);

        let queue = this.get('queue');
        let divIds = queue.toArray();
        queue.clear();

        this._pushCmd(googletag => {
            divIds.forEach( (id) => {
                this.trace(`display: ${id}`);
                googletag.display(id);
            });
        });
    }).restartable(),

    _pushCmd(cmdFunc) {
        this._wrapErrorHandling(() => {
            let { googletag } = window;
            googletag.cmd.push(() => {
                this._wrapErrorHandling(() => {
                    cmdFunc(googletag);
                });
            });
        });
    },
    _wrapErrorHandling(func) {
        try {
            func();
        }
        catch (e) {
            Ember.Logger.error('gpt exception: ', e);
        }
    },

    trace() {
        if (this.get('tracing')) {
            Ember.Logger.log(...arguments);
        }
    }
});
