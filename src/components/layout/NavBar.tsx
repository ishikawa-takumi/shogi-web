export type Screen = "dashboard" | "training" | "openings" | "settings";

type Props = {
  readonly current: Screen;
  readonly onNavigate: (screen: Screen) => void;
};

const NAV_ITEMS: { screen: Screen; label: string }[] = [
  { screen: "dashboard", label: "ホーム" },
  { screen: "openings", label: "定跡" },
  { screen: "settings", label: "設定" },
];

export function NavBar({ current, onNavigate }: Props) {
  return (
    <nav className="flex items-center gap-1 border-b border-stone-200 bg-white px-4 py-2">
      <span className="mr-4 text-lg font-bold text-stone-800">将棋トレーナー</span>
      {NAV_ITEMS.map(({ screen, label }) => (
        <button
          key={screen}
          onClick={() => onNavigate(screen)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            current === screen
              ? "bg-stone-800 text-white"
              : "text-stone-600 hover:bg-stone-100"
          }`}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
