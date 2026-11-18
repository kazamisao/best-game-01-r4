import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dist, polylineLength, pointInPolygon, polygonArea, isClosed } from '../game/src/geometry.js';

const SQUARE = [
  { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 },
];

test('dist is euclidean', () => {
  assert.equal(dist({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
  assert.equal(dist({ x: 2, y: 2 }, { x: 2, y: 2 }), 0);
});

test('polylineLength sums segment lengths', () => {
  assert.equal(polylineLength([{ x: 0, y: 0 }, { x: 3, y: 4 }]), 5);
  assert.equal(polylineLength([{ x: 0, y: 0 }, { x: 3, y: 4 }, { x: 6, y: 8 }]), 10);
  assert.equal(polylineLength([{ x: 1, y: 1 }]), 0);
  assert.equal(polylineLength([]), 0);
});

test('pointInPolygon: centre of a square is inside', () => {
  assert.equal(pointInPolygon({ x: 50, y: 50 }, SQUARE), true);
});

test('pointInPolygon: outside points are outside', () => {
  assert.equal(pointInPolygon({ x: 150, y: 50 }, SQUARE), false);
  assert.equal(pointInPolygon({ x: -5, y: 50 }, SQUARE), false);
  assert.equal(pointInPolygon({ x: 50, y: 101 }, SQUARE), false);
});

test('pointInPolygon: triangle', () => {
  const tri = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 100 }];
  assert.equal(pointInPolygon({ x: 10, y: 10 }, tri), true);
  assert.equal(pointInPolygon({ x: 80, y: 80 }, tri), false);
});

test('pointInPolygon: fewer than 3 vertices contains nothing', () => {
  assert.equal(pointInPolygon({ x: 0, y: 0 }, [{ x: 0, y: 0 }, { x: 10, y: 10 }]), false);
});

test('polygonArea: shoelace area is positive and exact', () => {
  assert.equal(polygonArea(SQUARE), 10000);
  assert.equal(polygonArea([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }]), 50);
  assert.equal(polygonArea([...SQUARE].reverse()), 10000);
});

test('isClosed: end near start with enough points closes', () => {
  const loop = [
    { x: 0, y: 0 }, { x: 60, y: 0 }, { x: 60, y: 60 }, { x: 0, y: 60 }, { x: 6, y: 4 },
  ];
  assert.equal(isClosed(loop, 30), true);
});

test('isClosed: end far from start stays open', () => {
  const open = [{ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 60, y: 60 }];
  assert.equal(isClosed(open, 30), false);
});

test('isClosed: two points never close', () => {
  assert.equal(isClosed([{ x: 0, y: 0 }, { x: 1, y: 1 }], 30), false);
});
