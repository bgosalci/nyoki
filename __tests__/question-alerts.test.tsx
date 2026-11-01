import { act, fireEvent, render, screen } from "@testing-library/react";

const mockRefresh = jest.fn();
let mockPath = "/admin/products";
jest.mock("next/navigation", () => ({
  usePathname: () => mockPath,
  useRouter: () => ({ refresh: mockRefresh }),
}));

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopBar } from "@/components/admin/admin-top-bar";
import { POLL_MS, QuestionAlertsProvider, QuestionSoundToggle } from "@/components/admin/question-alerts";
import { arrivalMessage } from "@/lib/questions/alerts";

const SINCE = "2026-10-25T21:00:00.000Z";
const fetchMock = jest.fn();

/** The waiting route's answer. */
function answer(body: object) {
  fetchMock.mockResolvedValue({ ok: true, json: async () => body });
}

function setup({ waiting = 1, children = <AdminSidebar /> }: { waiting?: number; children?: React.ReactNode } = {}) {
  const sound = jest.fn();
  render(
    <QuestionAlertsProvider initialWaiting={waiting} since={SINCE} playSound={sound}>
      {children}
    </QuestionAlertsProvider>,
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

beforeEach(() => {
  jest.useFakeTimers();
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  window.localStorage.clear();
  mockRefresh.mockClear();
  mockPath = "/admin/products";
  answer({ waiting: 1, arrived: 0, newest: null, checkedAt: "2026-10-25T21:00:10.000Z" });
});

afterEach(() => {
  jest.useRealTimers();
});

describe("question alerts", () => {
  it("shows how many questions wait beside Questions in the sidebar", () => {
    setup({ waiting: 3 });

    expect(questionsLink()).toHaveTextContent("3");
    expect(questionsLink()).toHaveAccessibleName("Questions, 3 waiting");
  });

  it("shows no count when nothing waits", () => {
    setup({ waiting: 0 });

    expect(questionsLink()).toHaveAccessibleName("Questions");
  });

  it("shows the count on the phone's Menu button too, where the sidebar is shut away", () => {
    setup({ waiting: 3, children: <AdminTopBar /> });

    const menu = screen.getByRole("button", { name: /^menu/i });
    expect(menu).toHaveTextContent("3");
    expect(menu).toHaveAccessibleName("Menu, 3 questions waiting");
  });

  it("says one question as one", () => {
    setup({ waiting: 1, children: <AdminTopBar /> });

    expect(screen.getByRole("button", { name: /^menu/i })).toHaveAccessibleName("Menu, 1 question waiting");
  });

  it("asks every ten seconds whether any have arrived since it last looked", async () => {
    setup();
    expect(fetchMock).not.toHaveBeenCalled();

    await tick();
    expect(fetchMock.mock.calls[0][0]).toBe(`/admin/questions/waiting?since=${encodeURIComponent(SINCE)}`);

    await tick();
    expect(fetchMock.mock.calls[1][0]).toBe(`/admin/questions/waiting?since=${encodeURIComponent("2026-10-25T21:00:10.000Z")}`);
  });

  it("chimes, says who asked about what, and updates the count when one arrives", async () => {
    const { sound } = setup();
    answer({ waiting: 2, arrived: 1, newest: { name: "Ada", productName: "Girl’s Coat" }, checkedAt: "2026-10-25T21:00:10.000Z" });

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
    answer({ waiting: 2, arrived: 1, newest: { name: "Ada", productName: null }, checkedAt: "2026-10-25T21:00:10.000Z" });

    await tick();

    expect(sound).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("New question from Ada");
  });

  it("refreshes the Questions list and the Overview when one arrives, and leaves other pages alone", async () => {
    answer({ waiting: 2, arrived: 1, newest: { name: "Ada", productName: null }, checkedAt: "2026-10-25T21:00:10.000Z" });

    mockPath = "/admin/products/p1";
    const first = render(<QuestionAlertsProvider initialWaiting={1} since={SINCE} playSound={jest.fn()}>{null}</QuestionAlertsProvider>);
    await tick();
    expect(mockRefresh).not.toHaveBeenCalled();
    first.unmount();

    mockPath = "/admin/questions";
    render(<QuestionAlertsProvider initialWaiting={1} since={SINCE} playSound={jest.fn()}>{null}</QuestionAlertsProvider>);
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
    setup({ children: <QuestionSoundToggle /> });

    const toggle = screen.getByRole("checkbox", { name: "Play a sound when a question arrives" });
    expect(toggle).toBeChecked();

    fireEvent.click(toggle);

    expect(toggle).not.toBeChecked();
    expect(window.localStorage.getItem("nyoki-admin-question-sound")).toBe("off");
  });
});

describe("arrivalMessage", () => {
  it("names who asked, and about which piece", () => {
    expect(arrivalMessage(1, { name: "Ada", productName: "Girl’s Coat" })).toBe("New question from Ada about Girl’s Coat");
    expect(arrivalMessage(1, { name: "Ada", productName: null })).toBe("New question from Ada");
  });

  it("counts several that arrived together", () => {
    expect(arrivalMessage(3, { name: "Ada", productName: null })).toBe("3 new questions");
  });
});
