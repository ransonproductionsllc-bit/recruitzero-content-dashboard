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

  function reviewPresentation(item = {}) {
    if (item.kind === 'test') {
      return {
        eyebrow: 'Test review copy',
        performanceNote: 'TEST artifact only. Performance tracking is not active.',
        publishingStatus: 'TEST artifact only. Nothing was published to LinkedIn.',
      };
    }

    const postStatus = String(item.post?.status || '');
    const awaitingApproval = item.status === 'awaiting_post_approval'
      || item.stage === 'post_approval'
      || postStatus === 'awaiting_approval';
    if (awaitingApproval) {
      return {
        eyebrow: 'Article awaiting approval',
        performanceNote: 'Publication remains manual. Performance tracking begins after publication.',
        publishingStatus: 'Draft reviewed. Cover generation and publishing are not authorized.',
      };
    }

    if (isFinished(item) || item.stage === 'assets_complete') {
      return {
        eyebrow: 'Completed article',
        performanceNote: 'Publication remains manual. Analytics can be added after publication.',
        publishingStatus: 'Completed workflow asset. Publishing remains a separate manual action.',
      };
    }

    return {
      eyebrow: 'Article review',
      performanceNote: 'Publication remains manual. Performance tracking begins after publication.',
      publishingStatus: 'This article is still moving through the review workflow.',
    };
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
    reviewPresentation,
  };
});
