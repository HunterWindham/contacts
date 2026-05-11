import { renderList, renderListStatus } from "../ui/contact-list-view.js";

const SEARCH_DEBOUNCE_MS = 300;

function getActionButton(target) {
  if (!(target instanceof Element)) return null;
  return target.closest("button[data-action]");
}

function debounce(callback, delayMs) {
  /** @type {number | null} */
  let timeoutId = null;

  return (...args) => {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
    timeoutId = window.setTimeout(() => {
      callback(...args);
    }, delayMs);
  };
}

export function createListPanelController({
  elements,
  onSelectContact,
  onCreateContact,
  onSearchChange,
}) {
  function bindEvents() {
    const debouncedSearchChange = debounce(onSearchChange, SEARCH_DEBOUNCE_MS);

    elements.newButton?.addEventListener("click", onCreateContact);
    elements.searchInput?.addEventListener("input", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      debouncedSearchChange(target.value);
    });
    elements.list?.addEventListener("click", (event) => {
      const button = getActionButton(event.target);
      if (!button || button.dataset.action !== "select") return;

      const id = Number(button.dataset.id);
      if (!id) return;
      onSelectContact(id);
    });
  }

  return {
    bindEvents,
    render(contacts, selectedId, searchQuery = "") {
      renderList(elements, contacts, selectedId, searchQuery);
    },
    renderStatus(message) {
      renderListStatus(elements, message);
    },
  };
}
