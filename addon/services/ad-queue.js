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

        let googletag = window.googletag;
        googletag.cmd.push( () => {
            try {
                let {adId, width, height, elementId} = component.getProperties('adId', 'width', 'height', 'elementId');
                this.trace(`defining slot: ${adId} @ ${width}x${height} in ${elementId}`);
                let slot = googletag.defineSlot(adId, [width, height], elementId)
                    .addService(googletag.pubads());
                component.set('slot', slot);
                component.addTargeting(slot);
            }
            catch (e) {
                Ember.Logger.error('gpt exception: ', e);
            }
        });

        this.get('displayAll').perform(1000);
    },

    loadGPT: task(function * (delay) {
        yield timeout(delay);

        let googletag = window.googletag;
        googletag.cmd.push( () => {
            try {
                this.trace('enableSingleRequest: ', googletag.pubads().enableSingleRequest());
                this.trace('enableServices: ', googletag.enableServices());
            }
            catch (e) {
                Ember.Logger.error('gpt exception: ', e);
            }
        });
    }).restartable(),

    displayAll: task(function * (delay) {
        yield timeout(delay);

        let queue = this.get('queue');
        let divIds = queue.toArray();
        queue.clear();

        let googletag = window.googletag;
        googletag.cmd.push( () => {
            try {
                divIds.forEach( (id) => {
                    this.trace(`display: ${id}`);
                    googletag.display(id);
                });
            }
            catch (e) {
                Ember.Logger.error('gpt exception: ', e);
            }
        });
    }).restartable(),

    trace() {
        if (this.get('tracing')) {
            Ember.Logger.log(...arguments);
        }
    }
});
