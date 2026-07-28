import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DialogFormBookmark from "./dialogFormBookmark";
import { FormType } from "@/consts/enum/formType";
import type { BookmarkDetail } from "@/types/bookmark/bookmarkDetail";
import type { CollectionDetail } from "@/types/collection/collectionDetail";

const ALICE = "auth0|user_a";

function collection(over: Partial<CollectionDetail> = {}): CollectionDetail {
  return {
    id: "col-alice-1",
    name: "Alice Reading List",
    description: null,
    ownerId: ALICE,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...over,
  };
}

function bookmark(over: Partial<BookmarkDetail> = {}): BookmarkDetail {
  return {
    id: "bm-alice-1",
    title: "Alice Bookmark",
    url: "https://alice.example.com",
    notes: "Private to Alice",
    collectionId: "col-alice-1",
    ownerId: ALICE,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...over,
  };
}

const ALICE_COLLECTIONS = [
  collection(),
  collection({ id: "col-alice-2", name: "Alice Recipes" }),
];

function renderDialog(props: Partial<Parameters<typeof DialogFormBookmark>[0]> = {}) {
  const handleModalSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();

  const view = render(
    <DialogFormBookmark
      open
      modalMode={FormType.CREATE}
      editingBookmark={null}
      collections={ALICE_COLLECTIONS}
      onClose={onClose}
      handleModalSubmit={handleModalSubmit}
      {...props}
    />,
  );

  return { ...view, handleModalSubmit, onClose };
}

const titleField = () => screen.getByRole("textbox", { name: /title/i });
const urlField = () => screen.getByRole("textbox", { name: /url/i });
const notesField = () => screen.getByRole("textbox", { name: /notes/i });
const collectionPicker = () => screen.getByRole("combobox", { name: /collection/i });

describe("DialogFormBookmark — the collection picker", () => {
  /**
   * PRIVACY-RELEVANT. The picker is the only place in the UI where one record
   * type can be pointed at another. It must offer exactly the collections it
   * was handed by the owner-scoped hook — no fetching of its own, nothing
   * cached from a previous user, nothing hard-coded.
   */
  it("offers exactly the collections it was given, plus the unfiled option", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(collectionPicker());
    const options = within(screen.getByRole("listbox")).getAllByRole("option");

    expect(options.map((o) => o.textContent)).toEqual([
      "No collection (unfiled)",
      "Alice Reading List",
      "Alice Recipes",
    ]);
  });

  it("shows nothing at all when the user owns no collections", async () => {
    const user = userEvent.setup();
    renderDialog({ collections: [] });

    await user.click(collectionPicker());
    const options = within(screen.getByRole("listbox")).getAllByRole("option");

    // Only the unfiled escape hatch — never a placeholder borrowed from
    // anywhere else.
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("No collection (unfiled)");
  });

  it("cannot surface a collection belonging to another user", async () => {
    const user = userEvent.setup();
    // Simulates the adversarial case: even if something upstream leaked Bob's
    // row into the app, it is not in this component's props, so it must not
    // be selectable.
    renderDialog();

    await user.click(collectionPicker());
    const listbox = screen.getByRole("listbox");

    expect(within(listbox).queryByText("Bob Recipes")).not.toBeInTheDocument();
    expect(within(listbox).getAllByRole("option")).toHaveLength(
      ALICE_COLLECTIONS.length + 1,
    );
  });
});

describe("DialogFormBookmark — seeding", () => {
  it("opens blank in CREATE mode", () => {
    renderDialog();

    expect(screen.getByText("Create Bookmark")).toBeInTheDocument();
    expect(titleField()).toHaveValue("");
    expect(urlField()).toHaveValue("");
    expect(notesField()).toHaveValue("");
  });

  it("seeds every field, including the current collection, when editing", () => {
    renderDialog({ modalMode: FormType.EDIT, editingBookmark: bookmark() });

    expect(titleField()).toHaveValue("Alice Bookmark");
    expect(urlField()).toHaveValue("https://alice.example.com");
    expect(notesField()).toHaveValue("Private to Alice");
    expect(collectionPicker()).toHaveTextContent("Alice Reading List");
  });

  it("renders null notes as an empty controlled input", () => {
    renderDialog({
      modalMode: FormType.EDIT,
      editingBookmark: bookmark({ notes: null }),
    });

    expect(notesField()).toHaveValue("");
  });

  it("re-seeds when a different bookmark is opened", () => {
    const { rerender, handleModalSubmit, onClose } = renderDialog({
      modalMode: FormType.EDIT,
      editingBookmark: bookmark(),
    });
    expect(titleField()).toHaveValue("Alice Bookmark");

    const other = bookmark({ id: "bm-alice-2", title: "Second", url: "https://second.example.com" });
    rerender(
      <DialogFormBookmark
        open={false}
        modalMode={FormType.EDIT}
        editingBookmark={null}
        collections={ALICE_COLLECTIONS}
        onClose={onClose}
        handleModalSubmit={handleModalSubmit}
      />,
    );
    rerender(
      <DialogFormBookmark
        open
        modalMode={FormType.EDIT}
        editingBookmark={other}
        collections={ALICE_COLLECTIONS}
        onClose={onClose}
        handleModalSubmit={handleModalSubmit}
      />,
    );

    expect(titleField()).toHaveValue("Second");
  });
});

describe("DialogFormBookmark — submit payload", () => {
  it("sends the chosen collection id", async () => {
    const user = userEvent.setup();
    const { handleModalSubmit } = renderDialog();

    await user.type(titleField(), "New bookmark");
    await user.type(urlField(), "https://new.example.com");
    await user.click(collectionPicker());
    await user.click(screen.getByRole("option", { name: "Alice Recipes" }));
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(handleModalSubmit).toHaveBeenCalledWith({
      title: "New bookmark",
      url: "https://new.example.com",
      notes: undefined,
      collectionId: "col-alice-2",
    });
  });

  /**
   * REGRESSION GUARD. The backend reads `null` as "unfile this bookmark" and
   * `undefined` as "leave the field alone". Sending undefined would make the
   * "No collection (unfiled)" option silently do nothing on an existing
   * bookmark.
   */
  it("sends null — not undefined — when the bookmark is unfiled", async () => {
    const user = userEvent.setup();
    const { handleModalSubmit } = renderDialog({
      modalMode: FormType.EDIT,
      editingBookmark: bookmark(),
    });

    await user.click(collectionPicker());
    await user.click(screen.getByRole("option", { name: "No collection (unfiled)" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    const payload = handleModalSubmit.mock.calls[0][0];
    expect(payload.collectionId).toBeNull();
    expect("collectionId" in payload).toBe(true);
  });

  it("prevents the native form submission that would reload the page", async () => {
    const user = userEvent.setup();
    const submitEvents: Event[] = [];
    const capture = (e: Event) => submitEvents.push(e);
    document.addEventListener("submit", capture);

    try {
      renderDialog();
      await user.type(titleField(), "Anything");
      await user.type(urlField(), "https://anything.example.com");
      await user.click(screen.getByRole("button", { name: "Create" }));
    } finally {
      document.removeEventListener("submit", capture);
    }

    expect(submitEvents).toHaveLength(1);
    expect(submitEvents[0].defaultPrevented).toBe(true);
  });
});
