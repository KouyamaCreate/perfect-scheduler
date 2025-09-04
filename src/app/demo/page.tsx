import { redirect } from 'next/navigation';

export const dynamic = 'force-static';

export default function DemoRedirectPage() {
  redirect('/schedule/demo');
}

