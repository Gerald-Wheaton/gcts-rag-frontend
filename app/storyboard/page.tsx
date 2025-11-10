'use client'

import { useState } from 'react'
import { Sparkles, ArrowUp, Home as HomeIcon, Layout } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function StoryboardPage() {
  const [hoveredButton, setHoveredButton] = useState<number | null>(null)
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Navigation */}
        <div className="mb-6 flex items-center gap-4">
          <nav className="flex items-center gap-2">
            <Link
              href="/"
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === '/'
                  ? 'text-foreground bg-muted'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <HomeIcon className="h-4 w-4" />
              Home
            </Link>
            <Link
              href="/ui-ideation"
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === '/ui-ideation'
                  ? 'text-foreground bg-muted'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              UI Ideation
            </Link>
            <Link
              href="/storyboard"
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === '/storyboard'
                  ? 'text-foreground bg-muted'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Layout className="h-4 w-4" />
              Storyboard
            </Link>
          </nav>
        </div>

        <div>
          <h1 className="text-3xl font-semibold mb-2">
            Button Centering Storyboard
          </h1>
          <p className="text-muted-foreground">
            Different approaches to center the Sparkles icon in the circular
            button. Hover over each button to see it expand.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {/* Version 1: Current Implementation */}
          <div className="space-y-3">
            <h3 className="font-medium">
              1. Current (flex + conditional padding)
            </h3>
            <button
              className="flex items-center justify-center h-8 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white transition-all duration-700 ease-in-out overflow-hidden"
              style={{
                width: hoveredButton === 1 ? '152px' : '32px',
                padding: hoveredButton === 1 ? '0 12px' : '0',
              }}
              onMouseEnter={() => setHoveredButton(1)}
              onMouseLeave={() => setHoveredButton(null)}
            >
              <Sparkles
                className="h-4 w-4 shrink-0"
                style={{ marginRight: hoveredButton === 1 ? '8px' : '0' }}
              />
              <span
                className="whitespace-nowrap text-sm font-medium transition-opacity duration-700"
                style={{ opacity: hoveredButton === 1 ? 1 : 0 }}
              >
                Propose Action
              </span>
            </button>
          </div>

          {/* Version 2: Explicit flex with no classes */}
          <div className="space-y-3">
            <h3 className="font-medium">
              2. Pure flex (no Tailwind utilities)
            </h3>
            <button
              className="rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white overflow-hidden"
              style={{
                width: hoveredButton === 2 ? '152px' : '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: hoveredButton === 2 ? '0 12px' : 0,
                margin: 0,
                transition: 'all 700ms ease-in-out',
              }}
              onMouseEnter={() => setHoveredButton(2)}
              onMouseLeave={() => setHoveredButton(null)}
            >
              <Sparkles
                className="h-4 w-4 shrink-0"
                style={{
                  marginRight: hoveredButton === 2 ? '8px' : '0',
                  transition: 'margin 700ms ease-in-out',
                }}
              />
              <span
                className="whitespace-nowrap text-sm font-medium"
                style={{
                  opacity: hoveredButton === 2 ? 1 : 0,
                  transition: 'opacity 700ms ease-in-out',
                }}
              >
                Propose Action
              </span>
            </button>
          </div>

          {/* Version 3: Grid centering */}
          <div className="space-y-3">
            <h3 className="font-medium">3. CSS Grid centering</h3>
            <button
              className="grid place-items-center h-8 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white transition-all duration-700 ease-in-out overflow-hidden"
              style={{
                width: hoveredButton === 3 ? '152px' : '32px',
                padding: hoveredButton === 3 ? '0 12px' : '0',
              }}
              onMouseEnter={() => setHoveredButton(3)}
              onMouseLeave={() => setHoveredButton(null)}
            >
              <div className="flex items-center">
                <Sparkles
                  className="h-4 w-4 shrink-0"
                  style={{
                    marginRight: hoveredButton === 3 ? '8px' : '0',
                    transition: 'margin 700ms ease-in-out',
                  }}
                />
                <span
                  className="whitespace-nowrap text-sm font-medium"
                  style={{
                    opacity: hoveredButton === 3 ? 1 : 0,
                    transition: 'opacity 700ms ease-in-out',
                  }}
                >
                  Propose Action
                </span>
              </div>
            </button>
          </div>

          {/* Version 4: Relative/Absolute positioning */}
          <div className="space-y-3">
            <h3 className="font-medium">4. Absolute positioning</h3>
            <button
              className="relative h-8 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white transition-all duration-700 ease-in-out overflow-hidden"
              style={{ width: hoveredButton === 4 ? '152px' : '32px' }}
              onMouseEnter={() => setHoveredButton(4)}
              onMouseLeave={() => setHoveredButton(null)}
            >
              <Sparkles
                className="h-4 w-4 transition-all duration-700 ease-in-out"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: hoveredButton === 4 ? '12px' : '50%',
                  transform:
                    hoveredButton === 4
                      ? 'translateY(-50%)'
                      : 'translate(-50%, -50%)',
                }}
              />
              <span
                className="absolute left-8 top-1/2 -translate-y-1/2 whitespace-nowrap text-sm font-medium transition-opacity duration-700"
                style={{ opacity: hoveredButton === 4 ? 1 : 0 }}
              >
                Propose Action
              </span>
            </button>
          </div>

          {/* Version 5: Flex with wrapper div */}
          <div className="space-y-3">
            <h3 className="font-medium">5. Flex with icon wrapper</h3>
            <button
              className="flex items-center justify-center h-8 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white transition-all duration-700 ease-in-out overflow-hidden"
              style={{
                width: hoveredButton === 5 ? '152px' : '32px',
                padding: hoveredButton === 5 ? '0 12px' : '0',
              }}
              onMouseEnter={() => setHoveredButton(5)}
              onMouseLeave={() => setHoveredButton(null)}
            >
              <div className="flex items-center justify-center">
                <Sparkles
                  className="h-4 w-4 shrink-0"
                  style={{
                    marginRight: hoveredButton === 5 ? '8px' : '0',
                    transition: 'margin 700ms ease-in-out',
                  }}
                />
                <span
                  className="whitespace-nowrap text-sm font-medium"
                  style={{
                    opacity: hoveredButton === 5 ? 1 : 0,
                    transition: 'opacity 700ms ease-in-out',
                  }}
                >
                  Propose Action
                </span>
              </div>
            </button>
          </div>

          {/* Version 6: Inline flex with box-sizing */}
          <div className="space-y-3">
            <h3 className="font-medium">6. Box-sizing border-box</h3>
            <button
              className="flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white overflow-hidden"
              style={{
                width: hoveredButton === 6 ? '152px' : '32px',
                height: '32px',
                padding: hoveredButton === 6 ? '0 12px' : 0,
                margin: 0,
                boxSizing: 'border-box',
                transition: 'all 700ms ease-in-out',
              }}
              onMouseEnter={() => setHoveredButton(6)}
              onMouseLeave={() => setHoveredButton(null)}
            >
              <Sparkles
                className="h-4 w-4 shrink-0"
                style={{
                  marginRight: hoveredButton === 6 ? '8px' : '0',
                  transition: 'margin 700ms ease-in-out',
                }}
              />
              <span
                className="whitespace-nowrap text-sm font-medium"
                style={{
                  opacity: hoveredButton === 6 ? 1 : 0,
                  transition: 'opacity 700ms ease-in-out',
                }}
              >
                Propose Action
              </span>
            </button>
          </div>

          {/* Version 7: Leading and size adjustments */}
          <div className="space-y-3">
            <h3 className="font-medium">7. Leading-none + shrink-0</h3>
            <button
              className="flex items-center justify-center h-8 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white leading-none transition-all duration-700 ease-in-out overflow-hidden"
              style={{
                width: hoveredButton === 7 ? '152px' : '32px',
                padding: hoveredButton === 7 ? '0 12px' : '0',
              }}
              onMouseEnter={() => setHoveredButton(7)}
              onMouseLeave={() => setHoveredButton(null)}
            >
              <Sparkles
                className="h-4 w-4 shrink-0"
                style={{
                  marginRight: hoveredButton === 7 ? '8px' : '0',
                  transition: 'margin 700ms ease-in-out',
                }}
              />
              <span
                className="whitespace-nowrap text-sm font-medium"
                style={{
                  opacity: hoveredButton === 7 ? 1 : 0,
                  transition: 'opacity 700ms ease-in-out',
                }}
              >
                Propose Action
              </span>
            </button>
          </div>

          {/* Version 8: Using lucide-react component with display block */}
          <div className="space-y-3">
            <h3 className="font-medium">8. Icon display: block</h3>
            <button
              className="flex items-center justify-center h-8 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white transition-all duration-700 ease-in-out overflow-hidden"
              style={{
                width: hoveredButton === 8 ? '152px' : '32px',
                padding: hoveredButton === 8 ? '0 12px' : '0',
              }}
              onMouseEnter={() => setHoveredButton(8)}
              onMouseLeave={() => setHoveredButton(null)}
            >
              <Sparkles
                className="h-4 w-4 shrink-0"
                style={{
                  display: 'block',
                  marginRight: hoveredButton === 8 ? '8px' : '0',
                  transition: 'margin 700ms ease-in-out',
                }}
              />
              <span
                className="whitespace-nowrap text-sm font-medium"
                style={{
                  opacity: hoveredButton === 8 ? 1 : 0,
                  transition: 'opacity 700ms ease-in-out',
                }}
              >
                Propose Action
              </span>
            </button>
          </div>
        </div>

        <div className="border-t pt-8 mt-8">
          <h2 className="text-xl font-semibold mb-4">Reference: Send Button</h2>
          <p className="text-sm text-muted-foreground mb-4">
            For comparison - the send button that appears properly centered
          </p>
          <button className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
