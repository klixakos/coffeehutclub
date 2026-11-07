import { Literata, Manrope } from 'next/font/google'
import './globals.css'

const serif = Literata({ subsets: ['latin', 'greek'], weight: ['600', '700'], variable: '--font-serif' })
const sans = Manrope({ subsets: ['latin', 'greek'], weight: ['400', '600', '800'], variable: '--font-sans' })

export const metadata = {
  title: 'Hut Club · Coffee Hut',
  description: 'Το πρόγραμμα επιβράβευσης του Coffee Hut',
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
  appleWebApp: { capable: true, title: 'Hut Club', statusBarStyle: 'black-translucent' },
}
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#2E3540' }

export default function RootLayout({ children }) {
  return (
    <html lang="el" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  )
}
