import './globals.css'

export const metadata = {
    title: 'SousChef AI',
    description: 'Your voice-powered cooking assistant',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className="bg-background text-foreground antialiased">{children}</body>
        </html>
    )
}
