(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.RecruitZeroDashboard = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function itemDayKey(item = {}) {
    const value = item.created_at || item.updated_at || '';
    const match = String(value).match(/^\d{4}-\d{2}-\d{2}/);
    if (match) return match[0];
    const idMatch = String(item.id || '').match(/\d{4}-\d{2}-\d{2}$/);
    return idMatch ? idMatch[0] : 'unknown-date';
  }

  function completionTimestamp(item = {}) {
    if (item.completed_at) return item.completed_at;
    const completionEvents = (item.events || [])
      .filter(event => /(^|_)assets_completed$/.test(String(event.type || '')) && event.at)
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    return completionEvents[0]?.at || item.updated_at || item.created_at || '';
  }

  function completionDateKey(item = {}) {
    const value = completionTimestamp(item);
    const match = String(value).match(/^\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : 'unknown-date';
  }

  function isFinished(item = {}) {
    return item.assets?.cover_status === 'complete' || Boolean(item.assets?.review_page_url);
  }

  function groupFinishedItems(items = []) {
    const groups = new Map();
    items.filter(isFinished).forEach(item => {
      const dateKey = completionDateKey(item);
      if (!groups.has(dateKey)) groups.set(dateKey, []);
      groups.get(dateKey).push(item);
    });

    return [...groups.entries()]
      .sort(([left], [right]) => {
        if (left === 'unknown-date') return 1;
        if (right === 'unknown-date') return -1;
        return right.localeCompare(left);
      })
      .map(([dateKey, groupItems]) => ({
        dateKey,
        items: groupItems.sort((left, right) => Date.parse(completionTimestamp(right)) - Date.parse(completionTimestamp(left))),
      }));
  }

  function actionUrl(sync = {}, item = {}, action, option = '') {
    const repo = sync.approval_repo;
    const hasOption = option !== '' && option !== null && option !== undefined;
    const title = `${action} ${item.id}${hasOption ? ` OPTION ${option}` : ''}`;
    const body = [
      `Workflow item: ${item.id}`,
      `Action: ${action}`,
      hasOption ? `Option: ${option}` : '',
      '',
      'This action was submitted from the RecruitZero content dashboard.',
    ].filter(Boolean).join('\n');
    return `https://github.com/${repo}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}&labels=approval`;
  }

  return {
    actionUrl,
    completionDateKey,
    completionTimestamp,
    groupFinishedItems,
    isFinished,
    itemDayKey,
  };
});
