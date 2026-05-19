import { redirect } from 'next/navigation';

export default function OldOrdersPage({ searchParams }: { searchParams: { placed?: string } }) {
  if (searchParams.placed) {
    redirect(`/profile/orders?placed=${searchParams.placed}`);
  }
  redirect('/profile/orders');
}
