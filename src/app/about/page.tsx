export const metadata = {
  title: '使い方 | Meetrace',
};

export default function AboutPage() {
  return (
    <main className="container py-10">
      <div className="surface-card p-6 md:p-8">
        <p className="eyebrow mb-3">Guide</p>
        <h1 className="mb-4 text-[2rem] font-bold text-[var(--foreground)]">Meetrace の使い方</h1>
        <p className="max-w-3xl text-base leading-7 text-[var(--foreground-muted)]">
          Meetrace は、候補日時を共有し、参加者がドラッグ操作で回答した空き時間の重なりを
          青の濃淡で見つけられるスケジュール調整ツールです。
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="surface-card p-6">
          <p className="mb-2 text-sm font-bold text-[var(--primary)]">1. 調整ページを作成</p>
          <p className="text-sm leading-6 text-[var(--foreground-muted)]">
            「新規作成」からイベント名と候補日時を入力すると、共有用の調整ページが生成されます。
          </p>
        </div>
        <div className="surface-card p-6">
          <p className="mb-2 text-sm font-bold text-[var(--primary)]">2. リンクを共有</p>
          <p className="text-sm leading-6 text-[var(--foreground-muted)]">
            生成された URL を参加者に送るだけで回答を集められます。匿名参加にも対応しています。
          </p>
        </div>
        <div className="surface-card p-6">
          <p className="mb-2 text-sm font-bold text-[var(--primary)]">3. なぞって回答</p>
          <p className="text-sm leading-6 text-[var(--foreground-muted)]">
            参加者は空いている時間帯をドラッグして、連続した候補時間をまとめて選択できます。
          </p>
        </div>
        <div className="surface-card p-6">
          <p className="mb-2 text-sm font-bold text-[var(--primary)]">4. 重なりを確認</p>
          <p className="text-sm leading-6 text-[var(--foreground-muted)]">
            回答の重なりは青のグラデーションで表示されるため、会いやすい時間帯をすぐ判断できます。
          </p>
        </div>
      </div>
    </main>
  );
}
