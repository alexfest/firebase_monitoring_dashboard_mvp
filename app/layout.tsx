
import './globals.css'

export const metadata = {
  title: 'Firestore Monitoring Dashboard',
  description: 'Admin-only dashboard powered by Firestore',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
