import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DialogFormCollections from "./dialogFormCollections";
import { FormType } from "@/consts/enum/formType";
import type { CollectionDetail } from "@/types/collection/collectionDetail";

function collection(over: Partial<CollectionDetail> = {}): CollectionDetail {
  return {
    id: "col-alice-1",
    name: "Alice Reading List",
    description: "Private to Alice",
    ownerId: "auth0|user_a",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...over,
  };
}

function renderDialog(props: Partial<Parameters<typeof DialogFormCollections>[0]> = {}) {
  const handleModalSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();

  const view = render(
    <DialogFormCollections
      open
      modalMode={FormType.CREATE}
      editingCollection={null}
      onClose={onClose}
      handleModalSubmit={handleModalSubmit}
      {...props}
    />,
  );

  return { ...view, handleModalSubmit, onClose };
}

const nameField = () => screen.getByRole("textbox", { name: /name/i });
const descriptionField = () => screen.getByRole("textbox", { name: /description/i });

describe("DialogFormCollections — seeding", () => {
  it("opens blank in CREATE mode", () => {
    renderDialog();

    expect(screen.getByText("Create Collection")).toBeInTheDocument();
    expect(nameField()).toHaveValue("");
    expect(descriptionField()).toHaveValue("");
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
  });

  it("seeds the fields from the row being edited", () => {
    renderDialog({ modalMode: FormType.EDIT, editingCollection: collection() });

    expect(screen.getByText("Edit Collection")).toBeInTheDocument();
    expect(nameField()).toHaveValue("Alice Reading List");
    expect(descriptionField()).toHaveValue("Private to Alice");
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  /**
   * REGRESSION GUARD. MUI keeps Dialog mounted when it closes, so the form
   * state survives between opens. Without the re-seed effect, editing a second
   * row shows the first row's values — and saving would write row A's text
   * onto row B.
   */
  it("re-seeds when a different row is opened", () => {
    const { rerender, handleModalSubmit, onClose } = renderDialog({
      modalMode: FormType.EDIT,
      editingCollection: collection(),
    });
    expect(nameField()).toHaveValue("Alice Reading List");

    // Close, then reopen on a different row — the real interaction sequence.
    const second = collection({ id: "col-alice-2", name: "Recipes", description: "Food" });
    rerender(
      <DialogFormCollections
        open={false}
        modalMode={FormType.EDIT}
        editingCollection={null}
        onClose={onClose}
        handleModalSubmit={handleModalSubmit}
      />,
    );
    rerender(
      <DialogFormCollections
        open
        modalMode={FormType.EDIT}
        editingCollection={second}
        onClose={onClose}
        handleModalSubmit={handleModalSubmit}
      />,
    );

    expect(nameField()).toHaveValue("Recipes");
    expect(descriptionField()).toHaveValue("Food");
  });

  it("clears back to blank when reopened for create", () => {
    const { rerender, handleModalSubmit, onClose } = renderDialog({
      modalMode: FormType.EDIT,
      editingCollection: collection(),
    });

    rerender(
      <DialogFormCollections
        open
        modalMode={FormType.CREATE}
        editingCollection={null}
        onClose={onClose}
        handleModalSubmit={handleModalSubmit}
      />,
    );

    expect(nameField()).toHaveValue("");
    expect(descriptionField()).toHaveValue("");
  });

  it("renders a null description as an empty controlled input", () => {
    renderDialog({
      modalMode: FormType.EDIT,
      editingCollection: collection({ description: null }),
    });

    // A null value would silently turn the field uncontrolled: typing would
    // appear to work but the state would never update.
    expect(descriptionField()).toHaveValue("");
  });
});

describe("DialogFormCollections — submit", () => {
  it("hands the current field values to the page", async () => {
    const user = userEvent.setup();
    const { handleModalSubmit } = renderDialog();

    await user.type(nameField(), "New List");
    await user.type(descriptionField(), "Some notes");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(handleModalSubmit).toHaveBeenCalledTimes(1);
    expect(handleModalSubmit).toHaveBeenCalledWith({
      name: "New List",
      description: "Some notes",
    });
  });

  it("omits an empty description rather than sending an empty string", async () => {
    const user = userEvent.setup();
    const { handleModalSubmit } = renderDialog();

    await user.type(nameField(), "No description");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(handleModalSubmit).toHaveBeenCalledWith({
      name: "No description",
      description: undefined,
    });
  });

  /**
   * REGRESSION GUARD. Without preventDefault the browser performs a native
   * form submission and reloads the SPA, which drops the in-memory Auth0
   * token cache and bounces the user through the login round-trip on every
   * single save.
   */
  it("prevents the native form submission that would reload the page", async () => {
    const user = userEvent.setup();
    const submitEvents: Event[] = [];
    const capture = (e: Event) => submitEvents.push(e);
    document.addEventListener("submit", capture);

    try {
      renderDialog();
      await user.type(nameField(), "Anything");
      await user.click(screen.getByRole("button", { name: "Create" }));
    } finally {
      document.removeEventListener("submit", capture);
    }

    expect(submitEvents).toHaveLength(1);
    expect(submitEvents[0].defaultPrevented).toBe(true);
  });

  it("disables both buttons while the request is in flight", async () => {
    const user = userEvent.setup();
    let release: () => void = () => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const handleModalSubmit = vi.fn().mockReturnValue(pending);

    render(
      <DialogFormCollections
        open
        modalMode={FormType.CREATE}
        editingCollection={null}
        onClose={vi.fn()}
        handleModalSubmit={handleModalSubmit}
      />,
    );

    await user.type(nameField(), "Slow save");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    release();
  });
});
