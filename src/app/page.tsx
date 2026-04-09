import Image from "next/image";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen" suppressHydrationWarning>
      <AppHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden py-14 md:py-20">
          <div className="absolute inset-x-0 top-0 h-[26rem] bg-[radial-gradient(circle_at_top_left,rgba(115,165,255,0.20),transparent_42%),linear-gradient(180deg,#f8fbff_0%,rgba(248,251,255,0)_100%)]" />
          <div className="container relative">
            <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-6">
                <p className="eyebrow">Meetrace</p>
                <h2 className="text-[2.5rem] font-medium leading-[1.22] tracking-[0.04em] text-[var(--foreground)] md:text-[3.4rem]">
                  <span className="block">なぞって選んで、</span>
                  <span className="block text-[var(--primary)]">重なる時間をすぐ見つける。</span>
                </h2>
                <p className="max-w-[38rem] text-base leading-7 text-[var(--foreground-muted)] md:text-lg">
                  Meetrace は、カレンダー上をドラッグして候補時間を直感的に選び、
                  参加者どうしで重なり合う時間をすばやく見つけるためのスケジュール調整サービスです。
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/create" prefetch={false} className="btn btn-primary">
                    新しく調整を始める
                  </Link>
                  <Link href="/schedule/demo" prefetch={false} className="btn btn-secondary">
                    デモで操作感を見る
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="status-pill">ドラッグで一括選択</span>
                  <span className="status-pill">青の濃淡で重なり可視化</span>
                  <span className="status-pill">匿名参加にも対応</span>
                </div>
              </div>

              <div className="surface-card overflow-hidden p-4 md:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-[var(--primary)]">Preview</p>
                    <p className="text-sm text-[var(--foreground-muted)]">会える時間を一目で判断</p>
                  </div>
                  <div className="rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-bold text-[var(--primary-strong)]">
                    drag + overlap
                  </div>
                </div>
                <div className="relative h-[320px] overflow-hidden rounded-xl border border-[var(--border)] bg-white md:h-[400px]">
                  <Image
                    src="/scheduler-preview.png"
                    alt="Meetrace Preview"
                    fill
                    style={{ objectFit: "cover" }}
                    className="rounded-xl"
                  />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-[var(--primary-soft)] px-4 py-3">
                    <p className="text-xs font-bold text-[var(--primary-strong)]">1</p>
                    <p className="mt-1 text-sm text-[var(--foreground-muted)]">時間帯をなぞって回答</p>
                  </div>
                  <div className="rounded-xl bg-white px-4 py-3 ring-1 ring-[var(--border)]">
                    <p className="text-xs font-bold text-[var(--primary-strong)]">2</p>
                    <p className="mt-1 text-sm text-[var(--foreground-muted)]">重なりを青の濃淡で確認</p>
                  </div>
                  <div className="rounded-xl bg-[var(--secondary)] px-4 py-3">
                    <p className="text-xs font-bold text-[var(--primary-strong)]">3</p>
                    <p className="mt-1 text-sm text-[var(--foreground-muted)]">会える時間をその場で決定</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="container">
            <div className="mb-10 text-center">
              <p className="eyebrow mb-3">How it works</p>
              <h2 className="text-[2rem] font-medium tracking-[0.02em] text-[var(--foreground)] md:text-[2.4rem]">
                調整のストレスを減らす、3つの体験
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="surface-card p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-lg font-bold text-[var(--primary-strong)]">
                  1
                </div>
                <h3 className="mb-2 text-lg font-bold text-[var(--foreground)]">候補時間を用意</h3>
                <p className="text-sm leading-6 text-[var(--foreground-muted)]">
                  イベント名と候補日を設定するだけで、回答用のタイムラインをすぐ共有できます。
                </p>
              </div>
              <div className="surface-card p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-lg font-bold text-[var(--primary-strong)]">
                  2
                </div>
                <h3 className="mb-2 text-lg font-bold text-[var(--foreground)]">ドラッグで回答</h3>
                <p className="text-sm leading-6 text-[var(--foreground-muted)]">
                  参加者はカレンダーをなぞるだけで、連続した空き時間をまとめて選択できます。
                </p>
              </div>
              <div className="surface-card p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-lg font-bold text-[var(--primary-strong)]">
                  3
                </div>
                <h3 className="mb-2 text-lg font-bold text-[var(--foreground)]">重なりを判断</h3>
                <p className="text-sm leading-6 text-[var(--foreground-muted)]">
                  回答の重なりは青のグラデーションで可視化され、会いやすい時間帯がすぐ見つかります。
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="container">
            <div
              className="overflow-hidden rounded-[0.75rem] px-6 py-8 text-[var(--primary-foreground)] shadow-[0_0_1rem_rgba(0,0,0,0.1),0_0.125rem_0.25rem_rgba(0,0,0,0.2)] md:px-10 md:py-10"
              style={{ background: 'linear-gradient(135deg, #143278 0%, #1e46aa 36%, #2864f0 100%)' }}
            >
              <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div className="max-w-2xl">
                  <p className="mb-2 text-sm font-bold uppercase tracking-[0.08em] text-white/80">Start now</p>
                  <h2 className="text-[2rem] font-medium leading-[1.25] tracking-[0.03em] md:text-[2.5rem]">
                    Meetrace で、
                    予定調整をもっと軽く。
                  </h2>
                  <p className="mt-3 text-base leading-7 text-white/82">
                    アカウント登録なしでも始められます。候補時間を作って、すぐ共有し、会える時間を決めましょう。
                  </p>
                </div>
                <Link
                  href="/create"
                  prefetch={false}
                  className="btn border border-white bg-white hover:bg-[var(--primary-soft)]"
                  style={{ color: 'var(--primary)' }}
                >
                  無料で始める
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border)] py-8">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <p className="font-semibold mb-1 text-[var(--foreground)]">Meetrace</p>
              <p className="text-sm text-[var(--foreground-muted)]">
                © 2025 All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
