// Startup coordinator: wires DOM events to API calls and UI updates.

import { ApiError, contactsApi } from "./contacts-api.js";
import {
  clearFormErrors,
  fillForm,
  focusFirstField,
  readForm,
  resetForm,
  setSubmitting,
  showFormErrors,
} from "../ui/contact-editor-view.js";
import { getElements } from "../ui/elements.js";
import { createEditorPanelController } from "./editor-panel-controller.js";
import { createListPanelController } from "./list-panel-controller.js";
import { showToast } from "../ui/toast-view.js";

export function initContactsController() {
  const elements = getElements();
  let contacts = [];
  let selectedContactId = null;
  let searchQuery = "";

  const listPanel = createListPanelController({
    elements,
    onSelectContact: startEdit,
    onSearchChange(query) {
      searchQuery = query;
      void loadContacts();
    },
    onCreateContact() {
      selectedContactId = null;
      resetForm(elements);
      listPanel.render(contacts, selectedContactId, searchQuery);
      focusFirstField(elements);
    },
  });

  const editorPanel = createEditorPanelController({
    elements,
    onSubmit: handleSubmit,
    onReset() {
      selectedContactId = null;
      resetForm(elements);
      listPanel.render(contacts, selectedContactId, searchQuery);
    },
    onDeleteSelected: handleDeleteSelected,
  });

  async function loadContacts() {
    listPanel.renderStatus("Loading contacts...");
    try {
      contacts = await contactsApi.list(searchQuery);
      const selectedContact = contacts.find((item) => item.id === selectedContactId);
      if (selectedContact) {
        fillForm(elements, selectedContact);
      } else if (selectedContactId !== null) {
        selectedContactId = null;
        resetForm(elements);
      }
      listPanel.render(contacts, selectedContactId, searchQuery);
    } catch (error) {
      listPanel.renderStatus("Could not load contacts. Make sure the backend is running.");
      showToast(elements, error.message || "Failed to load contacts", "error");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    clearFormErrors(elements);

    const { id, payload } = readForm(elements);
    setSubmitting(elements, true);

    try {
      if (id) {
        await contactsApi.update(id, payload);
        selectedContactId = id;
        showToast(elements, "Contact updated");
      } else {
        const createdContact = await contactsApi.create(payload);
        selectedContactId = Number(createdContact?.id) || null;
        showToast(elements, "Contact created");
      }
      await loadContacts();
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        showFormErrors(elements, error.errors);
      } else {
        showToast(elements, error.message || "Something went wrong", "error");
      }
    } finally {
      setSubmitting(elements, false);
    }
  }

  function startEdit(contactId) {
    const contact = contacts.find((item) => item.id === contactId);
    if (!contact) return;
    selectedContactId = contactId;
    fillForm(elements, contact);
    listPanel.render(contacts, selectedContactId, searchQuery);
    focusFirstField(elements);
  }

  async function handleDelete(contactId) {
    const contact = contacts.find((item) => item.id === contactId);
    if (!contact) return;

    const fullName = `${contact.first_name} ${contact.last_name}`.trim();
    if (!window.confirm(`Delete ${fullName}? This cannot be undone.`)) return;

    try {
      await contactsApi.remove(contactId);
      showToast(elements, "Contact deleted");
      if (selectedContactId === contactId) {
        selectedContactId = null;
        resetForm(elements);
      }
      await loadContacts();
    } catch (error) {
      showToast(elements, error.message || "Failed to delete contact", "error");
    }
  }

  function handleDeleteSelected() {
    const editingId = Number(elements.form.querySelector('input[name="id"]').value || 0);
    if (!editingId) {
      showToast(elements, "Select a contact first", "error");
      return;
    }
    void handleDelete(editingId);
  }

  resetForm(elements);
  listPanel.bindEvents();
  editorPanel.bindEvents();
  void loadContacts();
}
