/** Resolve all UI regions once at startup so render code stays declarative. */
export function getElements(root = document) {
  return {
    form: root.querySelector('[data-region="form"]'),
    formTitle: root.querySelector('[data-region="form-title"]'),
    formErrors: root.querySelector('[data-region="form-errors"]'),
    submit: root.querySelector('[data-region="submit"]'),
    resetButton: root.querySelector('[data-action="reset"]'),
    newButton: root.querySelector('[data-action="new"]'),
    addEmailButton: root.querySelector('[data-action="add-email"]'),
    deleteButton: root.querySelector('[data-action="delete-selected"]'),
    searchInput: root.querySelector('[data-region="search"]'),
    list: root.querySelector('[data-region="list"]'),
    listStatus: root.querySelector('[data-region="list-status"]'),
    emailsList: root.querySelector('[data-region="emails-list"]'),
    count: root.querySelector('[data-region="count"]'),
    toast: root.querySelector('[data-region="toast"]'),
  };
}
