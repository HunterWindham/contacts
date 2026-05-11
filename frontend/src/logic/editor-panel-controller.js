import {
  addEmailField,
  formatPhoneInput,
  removeEmailField,
} from "../ui/contact-editor-view.js";

function getActionButton(target) {
  if (!(target instanceof Element)) return null;
  return target.closest("button[data-action]");
}

export function createEditorPanelController({
  elements,
  onSubmit,
  onReset,
  onDeleteSelected,
}) {
  function bindEvents() {
    elements.form?.addEventListener("submit", onSubmit);
    elements.form?.addEventListener(
      "blur",
      (event) => {
        if (!(event.target instanceof HTMLInputElement)) return;
        if (event.target.name !== "phone") return;
        formatPhoneInput(event.target);
      },
      true,
    );
    elements.form?.addEventListener("click", (event) => {
      const button = getActionButton(event.target);
      if (!button || button.dataset.action !== "remove-email") return;
      removeEmailField(elements, button);
    });
    elements.resetButton?.addEventListener("click", onReset);
    elements.addEmailButton?.addEventListener("click", () => addEmailField(elements));
    elements.deleteButton?.addEventListener("click", onDeleteSelected);
  }

  return {
    bindEvents,
  };
}
