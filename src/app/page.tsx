import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* ヘッダー */}
      <header className="border-b border-[var(--border)]">
        <div className="container flex justify-between items-center py-4">
          <div className="flex items-center gap-2">
            <Image
              src="/calendar-icon.svg"
              alt="Perfect Scheduler Logo"
              width={32}
              height={32}
              className="hidden sm:block"
            />
            <h1 className="text-xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-transparent bg-clip-text">
              Perfect Scheduler
            </h1>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/about"
              className="text-[var(--foreground)] hover:text-[var(--primary)] transition"
            >
              使い方
            </Link>
            <Link href="/login" className="btn btn-secondary">
              ログイン
            </Link>
            <Link href="/create" className="btn btn-primary">
              新規作成
            </Link>
          </nav>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1">
        {/* ヒーローセクション */}
        <section className="py-16 md:py-24">
          <div className="container">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-4xl md:text-5xl font-bold mb-4">
                  スケジュール調整を
                  <br />
                  <span className="text-[var(--primary)]">簡単に。美しく。</span>
                </h2>
                <p className="text-lg mb-8 text-[var(--foreground)] opacity-80">
                  Perfect Schedulerでグループのスケジュール調整をスムーズに。
                  直感的な操作で最適な日程を見つけましょう。
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link href="/create" className="btn btn-primary">
                    スケジュールを作成する
                  </Link>
                  <Link href="/demo" className="btn btn-secondary">
                    デモを見る
                  </Link>
                </div>
              </div>
              <div className="relative h-[300px] md:h-[400px] rounded-lg overflow-hidden">
                <Image
                  src="/scheduler-preview.png"
                  alt="Perfect Scheduler Preview"
                  fill
                  style={{ objectFit: "cover" }}
                  className="rounded-lg"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 機能説明セクション */}
        <section className="py-16 bg-[var(--secondary)]">
          <div className="container">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              簡単3ステップでスケジュール調整
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-[var(--background)] p-6 rounded-lg shadow">
                <div className="w-12 h-12 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-full flex items-center justify-center font-bold text-xl mb-4">
                  1
                </div>
                <h3 className="text-xl font-semibold mb-2">イベントを作成</h3>
                <p className="text-[var(--foreground)] opacity-80">
                  イベント名と候補日時を設定するだけで、スケジュール調整ページが作成できます。
                </p>
              </div>
              <div className="bg-[var(--background)] p-6 rounded-lg shadow">
                <div className="w-12 h-12 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-full flex items-center justify-center font-bold text-xl mb-4">
                  2
                </div>
                <h3 className="text-xl font-semibold mb-2">リンクを共有</h3>
                <p className="text-[var(--foreground)] opacity-80">
                  生成されたURLを参加者に共有。登録不要で簡単に回答できます。
                </p>
              </div>
              <div className="bg-[var(--background)] p-6 rounded-lg shadow">
                <div className="w-12 h-12 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-full flex items-center justify-center font-bold text-xl mb-4">
                  3
                </div>
                <h3 className="text-xl font-semibold mb-2">最適な日程を決定</h3>
                <p className="text-[var(--foreground)] opacity-80">
                  全員の回答をビジュアルで確認し、最も都合の良い日時を簡単に見つけられます。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTAセクション */}
        <section className="py-16 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-[var(--primary-foreground)]">
          <div className="container text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              今すぐスケジュール調整を始めましょう
            </h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto opacity-90">
              アカウント登録不要。すぐに使えて、すぐに共有できます。
            </p>
            <Link
              href="/create"
              className="btn bg-white text-[var(--primary)] hover:bg-opacity-90"
            >
              無料で始める
            </Link>
          </div>
        </section>
      </main>

      {/* フッター */}
      <footer className="border-t border-[var(--border)] py-8">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <p className="font-semibold mb-1">Perfect Scheduler</p>
              <p className="text-sm text-[var(--foreground)] opacity-70">
                © 2025 All rights reserved.
              </p>
            </div>
            <div className="flex gap-6">
              <Link
                href="/terms"
                className="text-sm text-[var(--foreground)] opacity-70 hover:opacity-100"
              >
                利用規約
              </Link>
              <Link
                href="/privacy"
                className="text-sm text-[var(--foreground)] opacity-70 hover:opacity-100"
              >
                プライバシーポリシー
              </Link>
              <Link
                href="/contact"
                className="text-sm text-[var(--foreground)] opacity-70 hover:opacity-100"
              >
                お問い合わせ
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
