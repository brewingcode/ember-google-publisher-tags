import Ember from 'ember';
import {task, timeout} from 'ember-concurrency';

export default Ember.Service.extend({
    init() {
        this._super(...arguments);
        this.set('queue', []);
        this.get('loadGPT').perform(0);
    },

    push(component) {
        this.trace(`adding: ${component.get('adId')}`);

        this.get('queue').pushObject(component.get('elementId'));

        let googletag = window.googletag;
        googletag.cmd.push( () => {
            try {
                let {adId, width, height, elementId} = component.getProperties('adId', 'width', 'height', 'elementId');
                this.trace(`defining slot: ${adId} @ ${width}x${height} in ${elementId}`);
                let slot = googletag.defineSlot(adId, [width, height], elementId).addService(googletag.pubads());
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

        let divIds = this.get('queue');
        this.set('queue', []);

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
        if (1) {
            Ember.Logger.log(...arguments);
        }
    }
});
