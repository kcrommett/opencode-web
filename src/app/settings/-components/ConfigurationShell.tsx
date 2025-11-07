import { useState } from 'react'

interface ConfigurationShellProps {
  activeSection: string
  onSectionChange: (section: string) => void
  unsavedChanges: boolean
  configScope: 'global' | 'project'
  onScopeChange: (scope: 'global' | 'project') => void
  children: React.ReactNode
}

const sections = [
  { id: 'general', label: 'General' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'agents', label: 'Agents' },
  { id: 'providers', label: 'Providers' },
  { id: 'commands', label: 'Commands' },
  { id: 'mcp', label: 'MCP Servers' },
  { id: 'permissions', label: 'Permissions' },
  { id: 'tools', label: 'Tools' },
  { id: 'experimental', label: 'Experimental' },
  { id: 'keybinds', label: 'Keybinds' },
  { id: 'advanced', label: 'Advanced' },
]

export function ConfigurationShell({
  activeSection,
  onSectionChange,
  unsavedChanges,
  configScope,
  onScopeChange,
  children,
}: ConfigurationShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const getButtonClasses = (isActive: boolean) => {
    const baseClasses = "w-full flex items-center justify-start px-3 py-2 rounded-md text-sm font-medium transition-colors text-left"
    
    if (isActive) {
      return `${baseClasses} bg-accent text-accent-foreground`
    }
    return `${baseClasses} text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground`
  }

  return (
    <div className="flex h-full bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 flex-col border-r">
        <div className="p-4 border-b space-y-3">
          <h1 className="text-lg font-semibold">Settings</h1>
          
          {/* Scope Selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Configuration Scope</label>
            <select
              value={configScope}
              onChange={(e) => onScopeChange(e.target.value as 'global' | 'project')}
              className="w-full px-2 py-1.5 text-sm border rounded-md bg-background"
            >
              <option value="global">Global</option>
              <option value="project">Project</option>
            </select>
            <p className="text-xs text-muted-foreground">
              {configScope === 'global' ? '~/.config/opencode/opencode.jsonc' : 'project/opencode.jsonc'}
            </p>
          </div>
          
          {unsavedChanges && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              Unsaved changes
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <nav className="p-2 space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                className={getButtonClasses(activeSection === section.id)}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </div>

        {unsavedChanges && (
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <button className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
                Save
              </button>
              <button className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground">
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 w-9"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-background">
          <div className="flex flex-col h-full">
            <div className="p-4 border-b space-y-3">
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold">Settings</h1>
                <button
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground h-9 w-9"
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label="Close menu"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Scope Selector */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Configuration Scope</label>
                <select
                  value={configScope}
                  onChange={(e) => onScopeChange(e.target.value as 'global' | 'project')}
                  className="w-full px-2 py-1.5 text-sm border rounded-md bg-background"
                >
                  <option value="global">Global</option>
                  <option value="project">Project</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  {configScope === 'global' ? '~/.config/opencode/opencode.jsonc' : 'project/opencode.jsonc'}
                </p>
              </div>
              
              {unsavedChanges && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                  Unsaved changes
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <nav className="p-2 space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => {
                      onSectionChange(section.id)
                      setIsMobileMenuOpen(false)
                    }}
                    className={getButtonClasses(activeSection === section.id)}
                  >
                    {section.label}
                  </button>
                ))}
              </nav>
            </div>

            {unsavedChanges && (
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <button className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
                    Save
                  </button>
                  <button className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground">
                    Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}