import { act, fireEvent, render, screen, within } from "@testing-library/react";

const mockRefresh = jest.fn();
let mockPath = "/admin/products";
jest.mock("next/navigation", () => ({
  usePathname: () => mockPath,
  useRouter: () => ({ refresh: mockRefresh }),
}));

import { AdminAlertsProvider, AlertSoundToggle, POLL_MS } from "@/components/admin/admin-alerts";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopBar } from "@/components/admin/admin-top-bar";

const SINCE = "2026-10-25T21:00:00.000Z";
const CHECKED = "2026-10-25T21:00:10.000Z";
const fetchMock = jest.fn();

const none = { waiting: 0, arrived: 0, newest: null };

/** The waiting route's answer. */
function answer({ questions = { ...none, waiting: 1 }, reviews = none }: { questions?: object; reviews?: object } = {}) {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ questions, reviews, checkedAt: CHECKED }) });
}

function setup({
  questions = 1,
  reviews = 0,
  children = <AdminSidebar />,
}: { questions?: number; reviews?: number; children?: React.ReactNode } = {}) {
  const sound = jest.fn();
  render(
    <AdminAlertsProvider initialWaiting={{ questions, reviews }} since={SINCE} playSound={sound}>
      {children}
    </AdminAlertsProvider>,
  );
  return { sound };
}

/** Ten seconds on, and the answer in. */
async function tick() {
  await act(async () => {
    jest.advanceTimersByTime(POLL_MS);
  });
  await act(async () => {});
}

const questionsLink = () => screen.getByRole("link", { name: /^questions/i });
const reviewsLink = () => screen.getByRole("link", { name: /^reviews/i });

beforeEach(() => {
  jest.useFakeTimers();
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  window.localStorage.clear();
  mockRefresh.mockClear();
  mockPath = "/admin/products";
  answer();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("question alerts", () => {
  it("shows how many questions wait beside Questions in the sidebar", () => {
    setup({ questions: 3 });

    expect(questionsLink()).toHaveTextContent("3");
    expect(questionsLink()).toHaveAccessibleName("Questions, 3 waiting");
  });

  it("shows no count when nothing waits", () => {
    setup({ questions: 0 });

    expect(questionsLink()).toHaveAccessibleName("Questions");
  });

  it("shows the count on the phone's Menu button too, where the sidebar is shut away", () => {
    setup({ questions: 3, children: <AdminTopBar /> });

    const menu = screen.getByRole("button", { name: /^menu/i });
    expect(menu).toHaveTextContent("3");
    expect(menu).toHaveAccessibleName("Menu, 3 questions waiting");
  });

  it("says one question as one", () => {
    setup({ questions: 1, children: <AdminTopBar /> });

    expect(screen.getByRole("button", { name: /^menu/i })).toHaveAccessibleName("Menu, 1 question waiting");
  });

  it("asks every ten seconds whether any have arrived since it last looked", async () => {
    setup();
    expect(fetchMock).not.toHaveBeenCalled();

    await tick();
    expect(fetchMock.mock.calls[0][0]).toBe(`/admin/waiting?since=${encodeURIComponent(SINCE)}`);

    await tick();
    expect(fetchMock.mock.calls[1][0]).toBe(`/admin/waiting?since=${encodeURIComponent(CHECKED)}`);
  });

  it("chimes, says who asked about what, and updates the count when one arrives", async () => {
    const { sound } = setup();
    answer({ questions: { waiting: 2, arrived: 1, newest: { name: "Ada", productName: "Girl’s Coat" } } });

    await tick();

    expect(sound).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent("New question from Ada about Girl’s Coat");
    expect(screen.getByRole("link", { name: "Open questions" })).toHaveAttribute("href", "/admin/questions");
    expect(questionsLink()).toHaveAccessibleName("Questions, 2 waiting");
  });

  it("stays quiet when nothing has arrived", async () => {
    const { sound } = setup();

    await tick();

    expect(sound).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("keeps the sound off when it is switched off, but still says so", async () => {
    window.localStorage.setItem("nyoki-admin-question-sound", "off");
    const { sound } = setup();
    answer({ questions: { waiting: 2, arrived: 1, newest: { name: "Ada", productName: null } } });

    await tick();

    expect(sound).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("New question from Ada");
  });

  it("refreshes the Questions list and the Overview when one arrives, and leaves other pages alone", async () => {
    answer({ questions: { waiting: 2, arrived: 1, newest: { name: "Ada", productName: null } } });
    const provider = () => (
      <AdminAlertsProvider initialWaiting={{ questions: 1, reviews: 0 }} since={SINCE} playSound={jest.fn()}>
        {null}
      </AdminAlertsProvider>
    );

    mockPath = "/admin/products/p1";
    const first = render(provider());
    await tick();
    expect(mockRefresh).not.toHaveBeenCalled();
    first.unmount();

    mockPath = "/admin/questions";
    render(provider());
    await tick();
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("looks at once when the tab is come back to", async () => {
    setup();

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("lets the sound be switched off, and remembers it", () => {
    setup({ children: <AlertSoundToggle /> });

    const toggle = screen.getByRole("checkbox", { name: "Play a sound when a question or review arrives" });
    expect(toggle).toBeChecked();

    fireEvent.click(toggle);

    expect(toggle).not.toBeChecked();
    expect(window.localStorage.getItem("nyoki-admin-question-sound")).toBe("off");
  });
});

describe("review alerts", () => {
  it("shows how many reviews wait to be read beside Reviews in the sidebar", () => {
    setup({ questions: 0, reviews: 2 });

    expect(reviewsLink()).toHaveTextContent("2");
    expect(reviewsLink()).toHaveAccessibleName("Reviews, 2 waiting");
    expect(questionsLink()).toHaveAccessibleName("Questions");
  });

  it("counts both on the phone's Menu button, and says each", () => {
    setup({ questions: 1, reviews: 2, children: <AdminTopBar /> });

    const menu = screen.getByRole("button", { name: /^menu/i });
    expect(menu).toHaveTextContent("3");
    expect(menu).toHaveAccessibleName("Menu, 1 question and 2 reviews waiting");
  });

  it("chimes and says which piece was reviewed, by whom, when a review arrives", async () => {
    const { sound } = setup({ questions: 0 });
    answer({ questions: none, reviews: { waiting: 1, arrived: 1, newest: { name: "Bo P.", productName: "Robin Card", changed: false } } });

    await tick();

    expect(sound).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent("New review of Robin Card from Bo P.");
    expect(screen.getByRole("link", { name: "Open reviews" })).toHaveAttribute("href", "/admin/reviews");
    expect(reviewsLink()).toHaveAccessibleName("Reviews, 1 waiting");
  });

  it("says each when a question and a review arrive together, chiming once", async () => {
    const { sound } = setup({ questions: 0 });
    answer({
      questions: { waiting: 1, arrived: 1, newest: { name: "Ada", productName: null } },
      reviews: { waiting: 1, arrived: 1, newest: { name: "Bo P.", productName: "Robin Card", changed: true } },
    });

    await tick();

    expect(sound).toHaveBeenCalledTimes(1);
    const toast = screen.getByRole("status");
    expect(toast).toHaveTextContent("New question from Ada");
    expect(toast).toHaveTextContent("Changed review of Robin Card from Bo P.");
    expect(within(toast).getByRole("link", { name: "Open questions" })).toBeInTheDocument();
    expect(within(toast).getByRole("link", { name: "Open reviews" })).toBeInTheDocument();
  });

  it("refreshes the Reviews list when one arrives", async () => {
    mockPath = "/admin/reviews";
    setup({ questions: 0 });
    answer({ questions: none, reviews: { waiting: 1, arrived: 1, newest: { name: "Bo P.", productName: "Robin Card", changed: false } } });

    await tick();

    expect(mockRefresh).toHaveBeenCalled();
  });
});
