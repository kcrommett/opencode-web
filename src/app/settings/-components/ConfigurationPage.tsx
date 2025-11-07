import { useState, useEffect } from 'react'
import { useRouteContext } from '@tanstack/react-router'
import { ConfigurationShell } from './ConfigurationShell'
import { ConfigurationContent } from './ConfigurationContent'
import { useConfigUpdate } from '@/hooks/useConfigUpdate'
import { useTheme } from '@/hooks/useTheme'
import { useOpenCodeContext } from '@/contexts/OpenCodeContext'
import type { OpencodeConfig, McpStatusResponse, ProviderConfig } from '@/types/opencode'

export function ConfigurationPage() {
  const routeData = useRouteContext({ from: '/settings/configuration' }) as any
  const { config: contextConfig, loadConfig, currentProject } = useOpenCodeContext()
  const configUpdate = useConfigUpdate(contextConfig, loadConfig, currentProject?.worktree)
  const { currentTheme, changeTheme } = useTheme()
  
  const [activeSection, setActiveSection] = useState('general')
  const [unsavedChanges, setUnsavedChanges] = useState(false)
  const [localConfig, setLocalConfig] = useState<OpencodeConfig>(contextConfig || {})
  // Default to global scope for testing
  const [configScope, setConfigScope] = useState<'global' | 'project'>('global')

  // Sync local state with context data
  useEffect(() => {
    if (contextConfig) {
      setLocalConfig(contextConfig)
    }
  }, [contextConfig])

  // Get data from route loader
  const config = routeData.config || contextConfig || {}
  const agents = routeData.agents || []
  const providers = Object.entries(routeData.providers || {}).map(([id, providerConfig]) => ({ id, config: providerConfig as ProviderConfig }))
  const commands = routeData.commands || []
  const mcpStatus = routeData.mcpStatus || {}

  const handleConfigUpdate = async (updates: Partial<OpencodeConfig>) => {
    setLocalConfig(prev => ({ ...prev, ...updates }))
    setUnsavedChanges(true)
    
    try {
      // Use the explicitly selected scope from UI
      // Update each field individually using the existing function
      for (const [key, value] of Object.entries(updates)) {
        await configUpdate.updateConfigField(key as keyof OpencodeConfig, value, { scope: configScope })
      }
      
      // Reload config to ensure we have the latest state
      await loadConfig({ force: true })
      setUnsavedChanges(false)
    } catch (error) {
      console.error('Failed to update config:', error)
      // Revert on error by reloading config
      await loadConfig({ force: true })
      if (contextConfig) {
        setLocalConfig(contextConfig)
      }
    }
  }

  const handleThemeChange = async (newTheme: string) => {
    // Change theme immediately for better UX
    changeTheme(newTheme, true)
    // Save to config (will use appropriate scope)
    await handleConfigUpdate({ theme: newTheme })
  }

  const handleAgentUpdate = async (agentName: string, updates: any) => {
    try {
      await configUpdate.updateAgent(agentName, updates, { scope: configScope })
      await loadConfig({ force: true })
    } catch (error) {
      console.error('Failed to update agent:', error)
    }
  }

  const handleProviderUpdate = async (providerName: string, updates: any) => {
    try {
      await configUpdate.updateProvider(providerName, updates, { scope: configScope })
      await loadConfig({ force: true })
    } catch (error) {
      console.error('Failed to update provider:', error)
    }
  }

  const handleCommandUpdate = async (commandName: string, updates: any) => {
    try {
      await configUpdate.updateCommand(commandName, updates, { scope: configScope })
      await loadConfig({ force: true })
    } catch (error) {
      console.error('Failed to update command:', error)
    }
  }

  const handleAddAgent = async (agentData: any) => {
    try {
      await configUpdate.createAgent(agentData.name, agentData, { scope: configScope })
      await loadConfig({ force: true })
    } catch (error) {
      console.error('Failed to add agent:', error)
    }
  }

  const handleAddProvider = async (providerData: any) => {
    try {
      await configUpdate.createProvider(providerData.id, providerData.config, { scope: configScope })
      await loadConfig({ force: true })
    } catch (error) {
      console.error('Failed to add provider:', error)
    }
  }

  const handleAddCommand = async (commandData: any) => {
    try {
      await configUpdate.createCommand(commandData.name, commandData, { scope: configScope })
      await loadConfig({ force: true })
    } catch (error) {
      console.error('Failed to add command:', error)
    }
  }

  const handleRemoveAgent = async (agentName: string) => {
    try {
      await configUpdate.deleteAgent(agentName, { scope: configScope })
      await loadConfig({ force: true })
    } catch (error) {
      console.error('Failed to remove agent:', error)
    }
  }

  const handleRemoveProvider = async (providerName: string) => {
    try {
      await configUpdate.deleteProvider(providerName, { scope: configScope })
      await loadConfig({ force: true })
    } catch (error) {
      console.error('Failed to remove provider:', error)
    }
  }

  const handleRemoveCommand = async (commandName: string) => {
    try {
      await configUpdate.deleteCommand(commandName, { scope: configScope })
      await loadConfig({ force: true })
    } catch (error) {
      console.error('Failed to remove command:', error)
    }
  }

  return (
    <ConfigurationShell
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      unsavedChanges={unsavedChanges}
      configScope={configScope}
      onScopeChange={setConfigScope}
    >
      <ConfigurationContent
        section={activeSection}
        config={localConfig}
        agents={agents}
        providers={providers}
        commands={commands}
        mcpStatus={mcpStatus}
        currentTheme={currentTheme}
        onConfigUpdate={handleConfigUpdate}
        onThemeChange={handleThemeChange}
        onAgentUpdate={handleAgentUpdate}
        onProviderUpdate={handleProviderUpdate}
        onCommandUpdate={handleCommandUpdate}
        onAddAgent={handleAddAgent}
        onAddProvider={handleAddProvider}
        onAddCommand={handleAddCommand}
        onRemoveAgent={handleRemoveAgent}
        onRemoveProvider={handleRemoveProvider}
        onRemoveCommand={handleRemoveCommand}
      />
    </ConfigurationShell>
  )
}