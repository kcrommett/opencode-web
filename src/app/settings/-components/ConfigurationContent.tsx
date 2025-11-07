import { useState } from 'react'
import { Input } from '@/app/_components/ui/input'
import { Switch } from '@/app/_components/ui/switch'
import { themes } from '@/lib/themes'
import type { OpencodeConfig, Agent, Command, ProviderConfig, McpStatusResponse, PermissionConfig } from '@/types/opencode'

interface ConfigurationContentProps {
  section: string
  config: OpencodeConfig
  agents: Agent[]
  providers: Array<{ id: string; config: ProviderConfig }>
  commands: Command[]
  mcpStatus: McpStatusResponse
  currentTheme: string
  onConfigUpdate: (updates: Partial<OpencodeConfig>) => void
  onThemeChange: (theme: string) => void
  onAgentUpdate: (agentId: string, updates: Partial<Agent>) => void
  onProviderUpdate: (providerId: string, updates: Partial<ProviderConfig>) => void
  onCommandUpdate: (commandId: string, updates: Partial<Command>) => void
  onAddAgent: (agent: Omit<Agent, 'id'>) => void
  onAddProvider: (provider: { id: string; config: ProviderConfig }) => void
  onAddCommand: (command: Partial<Command>) => void
  onRemoveAgent: (agentId: string) => void
  onRemoveProvider: (providerId: string) => void
  onRemoveCommand: (commandName: string) => void
}

export function ConfigurationContent({
  section,
  config,
  agents,
  providers,
  commands,
  mcpStatus,
  currentTheme,
  onConfigUpdate,
  onThemeChange,
  onAgentUpdate,
  onProviderUpdate,
  onCommandUpdate,
  onAddAgent,
  onAddProvider,
  onAddCommand,
  onRemoveAgent,
  onRemoveProvider,
  onRemoveCommand,
}: ConfigurationContentProps) {
  const [newAgentName, setNewAgentName] = useState('')
  const [newProviderId, setNewProviderId] = useState('')
  const [newCommandName, setNewCommandName] = useState('')

  const renderGeneralSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">General Settings</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Auto Update</label>
            <Switch
              checked={config.autoupdate ?? true}
              onChange={(e) => onConfigUpdate({ autoupdate: e.target.checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Enable Snapshots</label>
            <Switch
              checked={config.snapshot ?? true}
              onChange={(e) => onConfigUpdate({ snapshot: e.target.checked })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Share Mode</label>
            <select
              className="w-full px-3 py-2 border rounded-md bg-background"
              value={config.share || 'manual'}
              onChange={(e) => onConfigUpdate({ share: e.target.value as 'manual' | 'auto' | 'disabled' })}
            >
              <option value="manual">Manual</option>
              <option value="auto">Auto</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Username</label>
            <Input
              value={config.username || ''}
              onChange={(e) => onConfigUpdate({ username: e.target.value })}
              placeholder="Enter your username"
            />
          </div>
        </div>
      </div>
    </div>
  )

  const renderAppearanceSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Appearance</h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Theme</label>
            <select
              className="w-full px-3 py-2 border rounded-md bg-background"
              value={currentTheme}
              onChange={(e) => onThemeChange(e.target.value)}
            >
              {Object.entries(themes).map(([id, theme]) => (
                <option key={id} value={id}>{theme.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Default Model</label>
            <Input
              value={config.model || ''}
              onChange={(e) => onConfigUpdate({ model: e.target.value })}
              placeholder="e.g., gpt-4, claude-3-sonnet"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Small Model</label>
            <Input
              value={config.small_model || ''}
              onChange={(e) => onConfigUpdate({ small_model: e.target.value })}
              placeholder="e.g., gpt-3.5-turbo, claude-3-haiku"
            />
          </div>
        </div>
      </div>
    </div>
  )

  const renderAgentsSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Agents</h3>
        
        <div className="space-y-4">
          {agents.map((agent) => (
            <div key={agent.id} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{agent.name}</h4>
                <button
                  onClick={() => onRemoveAgent(agent.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
              
              <div className="space-y-2">
                <Input
                  value={agent.description || ''}
                  onChange={(e) => onAgentUpdate(agent.id, { description: e.target.value })}
                  placeholder="Agent description"
                />
                
                {agent.model && (
                  <div className="flex gap-2">
                    <Input
                      value={agent.model.providerID}
                      onChange={(e) => onAgentUpdate(agent.id, { 
                        model: { ...agent.model!, providerID: e.target.value } 
                      })}
                      placeholder="Provider ID"
                    />
                    <Input
                      value={agent.model.modelID}
                      onChange={(e) => onAgentUpdate(agent.id, { 
                        model: { ...agent.model!, modelID: e.target.value } 
                      })}
                      placeholder="Model ID"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
          
          <div className="p-4 border-2 border-dashed rounded-lg">
            <h4 className="font-medium mb-2">Add New Agent</h4>
            <div className="flex gap-2">
              <Input
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
                placeholder="Agent name"
              />
              <button
                onClick={() => {
                  if (newAgentName.trim()) {
                    onAddAgent({
                      name: newAgentName.trim(),
                      mode: 'chat',
                      description: '',
                    })
                    setNewAgentName('')
                  }
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Add Agent
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderProvidersSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Providers</h3>
        
        <div className="space-y-4">
          {providers.map(({ id, config: providerConfig }) => (
            <div key={id} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{id}</h4>
                <button
                  onClick={() => onRemoveProvider(id)}
                  className="text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
              
              <div className="space-y-2">
                <Input
                  value={providerConfig.api || ''}
                  onChange={(e) => onProviderUpdate(id, { api: e.target.value })}
                  placeholder="API endpoint"
                />
                <Input
                  value={providerConfig.options?.apiKey || ''}
                  onChange={(e) => onProviderUpdate(id, { 
                    options: { ...providerConfig.options, apiKey: e.target.value } 
                  })}
                  placeholder="API key"
                  type="password"
                />
              </div>
            </div>
          ))}
          
          <div className="p-4 border-2 border-dashed rounded-lg">
            <h4 className="font-medium mb-2">Add New Provider</h4>
            <div className="flex gap-2">
              <Input
                value={newProviderId}
                onChange={(e) => setNewProviderId(e.target.value)}
                placeholder="Provider ID (e.g., openai, anthropic)"
              />
              <button
                onClick={() => {
                  if (newProviderId.trim()) {
                    onAddProvider({
                      id: newProviderId.trim(),
                      config: { api: '', options: {} }
                    })
                    setNewProviderId('')
                  }
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Add Provider
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderCommandsSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Commands</h3>
        
        <div className="space-y-4">
          {commands.map((command) => (
            <div key={command.name} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">/{command.name}</h4>
                {command.custom && (
                  <button
                    onClick={() => onRemoveCommand(command.name)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                )}
              </div>
              
              <div className="space-y-2">
                <Input
                  value={command.description || ''}
                  onChange={(e) => onCommandUpdate(command.name, { description: e.target.value })}
                  placeholder="Command description"
                />
                <Input
                  value={command.agent || ''}
                  onChange={(e) => onCommandUpdate(command.name, { agent: e.target.value })}
                  placeholder="Default agent"
                />
                <textarea
                  value={command.prompt || ''}
                  onChange={(e) => onCommandUpdate(command.name, { prompt: e.target.value })}
                  placeholder="Default prompt template"
                  className="w-full px-3 py-2 border rounded-md bg-background min-h-[100px]"
                />
              </div>
            </div>
          ))}
          
          <div className="p-4 border-2 border-dashed rounded-lg">
            <h4 className="font-medium mb-2">Add New Command</h4>
            <div className="flex gap-2">
              <Input
                value={newCommandName}
                onChange={(e) => setNewCommandName(e.target.value)}
                placeholder="Command name (without /)"
              />
              <button
                onClick={() => {
                  if (newCommandName.trim()) {
                    onAddCommand({
                      name: newCommandName.trim(),
                      description: '',
                      custom: true,
                    })
                    setNewCommandName('')
                  }
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Add Command
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderMcpSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">MCP Servers</h3>
        
        <div className="space-y-4">
          {Object.entries(config.mcp || {}).map(([serverName, serverConfig]) => (
            <div key={serverName} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{serverName}</h4>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    mcpStatus[serverName] === 'connected' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {mcpStatus[serverName] || 'unknown'}
                  </span>
                  <button
                    onClick={() => {
                      const newMcp = { ...config.mcp }
                      delete newMcp[serverName]
                      onConfigUpdate({ mcp: newMcp })
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={serverConfig.enabled ?? true}
                    onChange={(e) => {
                      const newMcp = { ...config.mcp }
                      newMcp[serverName] = { ...serverConfig, enabled: e.target.checked }
                      onConfigUpdate({ mcp: newMcp })
                    }}
                  />
                  <span className="text-sm">Enabled</span>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  Type: {serverConfig.type}
                </div>
                
                {serverConfig.command && (
                  <div className="text-sm text-muted-foreground">
                    Command: {serverConfig.command.join(' ')}
                  </div>
                )}
                
                {serverConfig.url && (
                  <div className="text-sm text-muted-foreground">
                    URL: {serverConfig.url}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          <div className="p-4 border-2 border-dashed rounded-lg">
            <p className="text-sm text-muted-foreground">
              MCP servers can be configured in your OpenCode configuration file.
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderPermissionsSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Permissions</h3>
        
        <div className="space-y-4">
          {['edit', 'bash', 'webfetch'].map((permission) => (
            <div key={permission} className="flex items-center justify-between">
              <label className="text-sm font-medium capitalize">{permission}</label>
              <select
                className="px-3 py-1 border rounded-md bg-background"
                value={config.permission?.[permission] || 'ask'}
                onChange={(e) => {
                  const newPermission: PermissionConfig = { 
                    ...config.permission, 
                    [permission]: e.target.value as 'ask' | 'allow' | 'deny'
                  }
                  onConfigUpdate({ permission: newPermission })
                }}
              >
                <option value="ask">Ask</option>
                <option value="allow">Allow</option>
                <option value="deny">Deny</option>
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderToolsSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Tools</h3>
        
        <div className="space-y-4">
          {['bash', 'read', 'write', 'edit', 'glob', 'grep', 'list', 'webfetch', 'task', 'todowrite', 'todoread'].map((tool) => (
            <div key={tool} className="flex items-center justify-between">
              <label className="text-sm font-medium capitalize">{tool}</label>
              <Switch
                checked={config.tools?.[tool as keyof typeof config.tools] ?? true}
                onChange={(e) => {
                  const newTools = { ...config.tools, [tool]: e.target.checked }
                  onConfigUpdate({ tools: newTools })
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderExperimentalSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Experimental Features</h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Chat Max Retries</label>
            <Input
              type="number"
              value={config.experimental?.chatMaxRetries || 0}
              onChange={(e) => {
                const newExperimental = { ...config.experimental, chatMaxRetries: parseInt(e.target.value) }
                onConfigUpdate({ experimental: newExperimental })
              }}
              min="0"
              max="10"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Disable Paste Summary</label>
            <Switch
              checked={config.experimental?.disable_paste_summary ?? false}
              onChange={(e) => {
                const newExperimental = { ...config.experimental, disable_paste_summary: e.target.checked }
                onConfigUpdate({ experimental: newExperimental })
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )

  const renderKeybindsSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Keybinds</h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Leader Key</label>
            <Input
              value={config.keybinds?.leader || ''}
              onChange={(e) => {
                const newKeybinds = { ...config.keybinds, leader: e.target.value }
                onConfigUpdate({ keybinds: newKeybinds })
              }}
              placeholder="e.g., space"
            />
          </div>
          
          <div className="text-sm text-muted-foreground">
            Other keybinds can be configured in your OpenCode configuration file.
          </div>
        </div>
      </div>
    </div>
  )

  const renderAdvancedSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Advanced Settings</h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Disabled Providers</label>
            <Input
              value={config.disabled_providers?.join(', ') || ''}
              onChange={(e) => {
                const providers = e.target.value.split(',').map(p => p.trim()).filter(p => p)
                onConfigUpdate({ disabled_providers: providers })
              }}
              placeholder="Comma-separated list of provider IDs"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Plugins</label>
            <Input
              value={config.plugin?.join(', ') || ''}
              onChange={(e) => {
                const plugins = e.target.value.split(',').map(p => p.trim()).filter(p => p)
                onConfigUpdate({ plugin: plugins })
              }}
              placeholder="Comma-separated list of plugin paths"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Instructions</label>
            <textarea
              value={config.instructions?.join('\n') || ''}
              onChange={(e) => {
                const instructions = e.target.value.split('\n').filter(i => i.trim())
                onConfigUpdate({ instructions })
              }}
              placeholder="One instruction per line"
              className="w-full px-3 py-2 border rounded-md bg-background min-h-[100px]"
            />
          </div>
        </div>
      </div>
    </div>
  )

  const sections = {
    general: renderGeneralSection,
    appearance: renderAppearanceSection,
    agents: renderAgentsSection,
    providers: renderProvidersSection,
    commands: renderCommandsSection,
    mcp: renderMcpSection,
    permissions: renderPermissionsSection,
    tools: renderToolsSection,
    experimental: renderExperimentalSection,
    keybinds: renderKeybindsSection,
    advanced: renderAdvancedSection,
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      {sections[section as keyof typeof sections]?.() || (
        <div className="text-center text-muted-foreground">
          Section not implemented yet
        </div>
      )}
    </div>
  )
}