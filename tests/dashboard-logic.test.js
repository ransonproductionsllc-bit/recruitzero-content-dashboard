const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  actionUrl,
  completionTimestamp,
  groupFinishedItems,
  itemDayKey,
} = require('../dashboard-logic.js');

test('clear action targets only the selected daily search item', () => {
  const url = new URL(actionUrl(
    { approval_repo: 'owner/repo' },
    { id: 'ai-martech-topic-queue-2026-11-05' },
    'CLEAR DAY'
  ));

  assert.equal(url.pathname, '/owner/repo/issues/new');
  assert.equal(url.searchParams.get('title'), 'CLEAR DAY ai-martech-topic-queue-2026-11-05');
  assert.match(url.searchParams.get('body'), /Workflow item: ai-martech-topic-queue-2026-11-05/);
  assert.match(url.searchParams.get('body'), /Action: CLEAR DAY/);
});

test('archive action targets one selected topic option', () => {
  const url = new URL(actionUrl(
    { approval_repo: 'owner/repo' },
    { id: 'ai-martech-topic-queue-2026-11-05' },
    'ARCHIVE TOPIC',
    2
  ));

  assert.equal(url.searchParams.get('title'), 'ARCHIVE TOPIC ai-martech-topic-queue-2026-11-05 OPTION 2');
  assert.match(url.searchParams.get('body'), /Option: 2/);
});

test('finished packages use the assets-completed event as their completion date', () => {
  const item = {
    updated_at: '2026-11-05T17:00:00-05:00',
    events: [
      { type: 'assets_completed', at: '2026-11-04T11:16:23-05:00' },
      { type: 'post_opening_updated', at: '2026-11-05T17:00:00-05:00' },
    ],
  };

  assert.equal(completionTimestamp(item), '2026-11-04T11:16:23-05:00');
});

test('finished packages are grouped by completion date with newest dates first', () => {
  const items = [
    { id: 'older', updated_at: '2026-11-02T12:00:00-05:00', assets: { cover_status: 'complete' } },
    { id: 'newer-b', updated_at: '2026-11-05T09:00:00-05:00', assets: { review_page_url: 'review-b' } },
    { id: 'newer-a', updated_at: '2026-11-05T11:00:00-05:00', assets: { cover_status: 'complete' } },
  ];

  const groups = groupFinishedItems(items);

  assert.deepEqual(groups.map(group => group.dateKey), ['2026-11-05', '2026-11-02']);
  assert.deepEqual(groups[0].items.map(item => item.id), ['newer-a', 'newer-b']);
});

test('unknown and malformed completion dates sort after valid date groups', () => {
  const items = [
    { id: 'unknown', assets: { cover_status: 'complete' } },
    { id: 'valid', updated_at: '2026-11-05T11:00:00-05:00', assets: { cover_status: 'complete' } },
    { id: 'malformed', updated_at: 'not-a-date', assets: { review_page_url: 'review' } },
  ];

  const groups = groupFinishedItems(items);

  assert.deepEqual(groups.map(group => group.dateKey), ['2026-11-05', 'unknown-date']);
  assert.deepEqual(groups[1].items.map(item => item.id), ['unknown', 'malformed']);
});

test('daily search key comes from the item creation date', () => {
  assert.equal(itemDayKey({ created_at: '2026-11-05T08:17:51-05:00' }), '2026-11-05');
});

test('dashboard exposes per-day clear and per-article archive actions', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.match(html, /dashboard-logic\.js/);
  assert.match(html, /CLEAR DAY/);
  assert.match(html, /ARCHIVE TOPIC/);
  assert.match(html, /Clear this day[^<]*search/);
  assert.match(html, /Archive article/);
});

test('finished asset rendering uses completion-date groups', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.match(html, /groupFinishedItems/);
  assert.match(html, /asset-date-group/);
  assert.match(html, /Completed /);
});
