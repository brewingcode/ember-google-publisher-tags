import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';

moduleForComponent('google-publisher-tag', 'Integration | Component | google publisher tag', {
  integration: true
});

test('it renders', function(assert) {
  // Set any properties with this.set('myProperty', 'value');
  // Handle any actions with this.on('myAction', function(val) { ... });

  this.render(hbs`{{google-publisher-tag}}`);

  assert.equal(this.$().text().trim(), '');

//   // Template block usage:
//   this.render(hbs`
//     {{#google-publisher-tag}}
//       template block text
//     {{/google-publisher-tag}}
//   `);
//
//   assert.equal(this.$().text().trim(), 'template block text');
});
