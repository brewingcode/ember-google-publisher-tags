import Ember from 'ember';
import {task, timeout} from 'ember-concurrency';

export default Ember.Service.extend({
    init() {
        this._super(...arguments);
        this.set('queue', []);
    },

    push(component) {
        this.trace(`adding: ${component.get('adId')}`, component);

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

        this.get('loadGPT').perform();
    },

    loadGPT: task(function * () {
        yield timeout(1000);

        let googletag = window.googletag;
        googletag.cmd.push( () => {
            try {
                let b = googletag.pubads().enableSingleRequest();
                this.trace(`enableSingleRequest: ${b}`);

                b = googletag.enableServices();
                this.trace(`enableServices: ${b}`);
            }
            catch (e) {
                Ember.Logger.error('gpt exception: ', e);
            }
        });

        let divIds = this.get('queue');
        this.set('queue', []);
        this.get('displayAll').perform(divIds);
    }).restartable(),

    displayAll: task(function * (ids) {
        yield timeout(2000);

        let googletag = window.googletag;
        googletag.cmd.push( () => {
            try {
                ids.forEach( (id) => {
                    this.trace(`display: ${id}`);
                    googletag.display(id);
                });
            }
            catch (e) {
                Ember.Logger.error('gpt exception: ', e);
            }
        });
    }),

    trace() {
        if (1) {
            Ember.Logger.log(...arguments);
        }
    }
});
