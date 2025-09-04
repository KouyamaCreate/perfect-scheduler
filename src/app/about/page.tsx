export const metadata = {
  title: '使い方 | Perfect Scheduler',
};

export default function AboutPage() {
  return (
    <main className="container py-8">
      <h1 className="text-3xl font-bold mb-4">Perfect Scheduler の使い方</h1>
      <p className="mb-4">
        Perfect Scheduler は、候補日時を共有して参加者の都合を集め、最適な日程を見つけるためのツールです。
      </p>
      <ol className="list-decimal list-inside space-y-2">
        <li>「新規作成」からイベント名と候補日時を入力します。</li>
        <li>作成後に表示される共有用URLを参加者へ送ります。</li>
        <li>参加者はログイン不要（内部的には匿名認証）で回答できます。</li>
        <li>集計を見ながら最適な日時を決定します。</li>
      </ol>
    </main>
  );
}

