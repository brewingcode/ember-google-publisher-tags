import { test } from 'qunit';
import moduleForAcceptance from '../../tests/helpers/module-for-acceptance';

moduleForAcceptance('Acceptance | index');

function isAdRendered(selector) {
  return find(selector).find('iframe').length !== 0;
}

test('visiting /', function(assert) {
  visit('/');

  andThen(function() {
    assert.ok(isAdRendered('.start-shown'), 'renders when shown');
    assert.notOk(isAdRendered('.start-hidden'), 'doesn\'t render when hidden');
  });
});
