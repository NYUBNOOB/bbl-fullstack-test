import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CollectionsPage from "./collectionsPage";
import { collectionService } from "@/services/collection";
import type { CollectionDetail } from "@/types/collection/collectionDetail";

vi.mock("@/services/collection", () => ({
  collectionService: {
    getCollections: vi.fn(),
    getCollection: vi.fn(),
    createCollection: vi.fn(),
    updateCollection: vi.fn(),
    deleteCollection: vi.fn(),
  },
}));

const getCollections = vi.mocked(collectionService.getCollections);
const createCollection = vi.mocked(collectionService.createCollection);
const updateCollection = vi.mocked(collectionService.updateCollection);
const deleteCollection = vi.mocked(collectionService.deleteCollection);

function collection(over: Partial<CollectionDetail> = {}): CollectionDetail {
  return {
    id: "col-1",
    name: "Reading List",
    description: "Books",
    ownerId: "auth0|user_a",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...over,
  };
}

const FIRST = collection();
const SECOND = collection({ id: "col-2", name: "Recipes", description: "Food" });

/** Renders and waits for the initial fetch to settle. */
async function renderPage(rows: CollectionDetail[] = [FIRST, SECOND]) {
  getCollections.mockResolvedValue(rows);
  render(<CollectionsPage />);
  if (rows.length) {
    await screen.findByText(rows[0].name);
  } else {
    await screen.findByText(/no collections yet/i);
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  createCollection.mockResolvedValue(FIRST);
  updateCollection.mockResolvedValue(FIRST);
  deleteCollection.mockResolvedValue(undefined);
});

describe("CollectionsPage — listing", () => {
  it("renders the rows returned by the owner-scoped endpoint", async () => {
    await renderPage();

    expect(screen.getByText("Reading List")).toBeInTheDocument();
    expect(screen.getByText("Recipes")).toBeInTheDocument();
    expect(getCollections).toHaveBeenCalledTimes(1);
  });

  it("shows the empty state instead of inventing rows", async () => {
    await renderPage([]);

    expect(screen.getByText(/no collections yet/i)).toBeInTheDocument();
  });
});

describe("CollectionsPage — create", () => {
  it("POSTs a new collection and never issues an update", async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByRole("button", { name: /new collection/i }));
    await user.type(screen.getByRole("textbox", { name: /name/i }), "Travel");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(createCollection).toHaveBeenCalledTimes(1));
    expect(createCollection).toHaveBeenCalledWith({
      name: "Travel",
      description: undefined,
    });
    expect(updateCollection).not.toHaveBeenCalled();
  });

  it("refetches the list so the new row appears without a page reload", async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByRole("button", { name: /new collection/i }));
    await user.type(screen.getByRole("textbox", { name: /name/i }), "Travel");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(getCollections).toHaveBeenCalledTimes(2));
  });
});

describe("CollectionsPage — edit", () => {
  /**
   * REGRESSION GUARD, and the closest thing this page has to an ownership
   * assertion: the row you clicked is the row that gets written. An empty
   * useCallback dependency array here previously froze `editingCollection` at
   * its first-render value, which meant editing the second row issued a PUT
   * against the first row's id — one user silently overwriting a different
   * record than the one shown in the dialog.
   */
  it("PUTs against the id of the row that was clicked, not the first row", async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByRole("button", { name: "Edit Recipes" }));

    // The dialog must be showing the second row before we save.
    expect(screen.getByRole("textbox", { name: /name/i })).toHaveValue("Recipes");

    await user.clear(screen.getByRole("textbox", { name: /name/i }));
    await user.type(screen.getByRole("textbox", { name: /name/i }), "Recipes v2");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(updateCollection).toHaveBeenCalledTimes(1));
    expect(updateCollection).toHaveBeenCalledWith("col-2", {
      name: "Recipes v2",
      description: "Food",
    });
    expect(createCollection).not.toHaveBeenCalled();
  });

  it("switches cleanly from editing one row to creating a new one", async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByRole("button", { name: "Edit Recipes" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    // MUI aria-hides the page behind an open Dialog and only releases it once
    // the exit transition finishes; querying by role before then finds nothing.
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: /new collection/i }));

    // Stale values here would mean the create form is pre-filled with — and
    // could re-submit — another record's content.
    expect(screen.getByRole("textbox", { name: /name/i })).toHaveValue("");

    await user.type(screen.getByRole("textbox", { name: /name/i }), "Fresh");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(createCollection).toHaveBeenCalledTimes(1));
    expect(updateCollection).not.toHaveBeenCalled();
  });
});

describe("CollectionsPage — delete", () => {
  it("deletes the row that was clicked", async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByRole("button", { name: "Delete Recipes" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/"Recipes"/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(deleteCollection).toHaveBeenCalledTimes(1));
    expect(deleteCollection).toHaveBeenCalledWith("col-2");
  });

  it("does nothing when the confirmation is cancelled", async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByRole("button", { name: "Delete Recipes" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }),
    );

    expect(deleteCollection).not.toHaveBeenCalled();
  });
});
