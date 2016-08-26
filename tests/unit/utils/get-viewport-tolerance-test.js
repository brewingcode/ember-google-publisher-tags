import getViewportTolerance from 'ember-google-publisher-tags/utils/get-viewport-tolerance';
import { module, test } from 'qunit';

module('Unit | Utility | get viewport tolerance');

test('50% test', function(assert) {
  let result = getViewportTolerance(500, 500, 0.5);

  assert.deepEqual(result, {
    top: 73.22330470336314,
    bottom: 73.22330470336314,
    left: 73.22330470336314,
    right: 73.22330470336314
  });
});

test('>50% test', function(assert) {
  let result = getViewportTolerance(100, 200, 4/5);

  assert.deepEqual(result, {
    top: 10.557280900008408,
    bottom: 10.557280900008408,
    left: 5.278640450004204,
    right: 5.278640450004204
  });
});

test('<50% test', function(assert) {
  let result = getViewportTolerance(200, 100, 1/3);

  assert.deepEqual(result, {
    top: 21.13248654051871,
    bottom: 21.13248654051871,
    left: 42.26497308103742,
    right: 42.26497308103742
  });
});

test('100% test', function(assert) {
  let result = getViewportTolerance(200, 100, 1);

  assert.deepEqual(result, {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  });
});
