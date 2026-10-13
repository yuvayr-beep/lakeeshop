import { redirect } from 'next/navigation';

export default function ManageClaimsRedirectPage() {
  redirect('/admin/orders/rto/return-intake');
}
