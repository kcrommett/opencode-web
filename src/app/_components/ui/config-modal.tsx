import { useState, useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { View, Separator, Button, Checkbox, Pre } from './'
import { Dialog } from './dialog'
import { useConfigUpdate } from '@/hooks/useConfigUpdate'
import { useTheme } from '@/hooks/useTheme'
import { useOpenCodeContext } from '@/contexts/OpenCodeContext'
import { themes } from '@/lib/themes'
import type { McpStatusResponse, OpencodeConfig, ConfigUpdateResponse } from '@/types/opencode'
import { openCodeService } from '@/lib/opencode-client'

function extractConfigErrorMessage(error: unknown): { message: string; path?: string } {
  const fallback =
    error instanceof Error && typeof error.message === 'string'
      ? error.message
      : 'Failed to save configuration'

  const toRecord = (value: unknown): Record<string, unknown> | null => {
    if (value && typeof value === 'object') return value as Record<string, unknown>
    return null
  }

  const root = toRecord(error)
  const detailSources = [toRecord(root?.details), toRecord(root?.data), root]

  for (const source of detailSources) {
    if (!source) continue
    const nested = toRecord(source.data)
    const issuesMaybe = Array.isArray(source.issues)
      ? (source.issues as Array<Record<string, unknown>>)
      : nested && Array.isArray(nested.issues)
        ? (nested.issues as Array<Record<string, unknown>>)
        : undefined

    const issueMessage = issuesMaybe?.find((issue) => typeof issue?.message === 'string')
      ?.message as string | undefined

    const pathCandidate =
      typeof source.path === 'string'
        ? source.path
        : nested && typeof nested.path === 'string'
          ? nested.path
          : undefined

    const messageCandidate =
      (typeof source.message === 'string' && source.message) ||
      (nested && typeof nested.message === 'string' ? nested.message : undefined) ||
      issueMessage

    if (messageCandidate || pathCandidate) {
      return {
        message: messageCandidate ?? fallback,
        path: pathCandidate,
      }
    }
  }

  return { message: fallback }
}

interface ConfigModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ConfigModal({ isOpen, onClose }: ConfigModalProps) {
  const {
    config: contextConfig,
    globalConfig,
    projectConfig,
    configLoading: contextConfigLoading,
    loadConfig,
    currentProject,
    configTargets,
    registerConfigTarget,
    showToast,
  } = useOpenCodeContext()

  const [configScope, setConfigScope] = useState<'global' | 'project'>('global')
  const hasInitializedScopeRef = useRef(false)
  const scopeConfig = configScope === 'project' ? projectConfig : globalConfig
  const scopeAwareConfig = scopeConfig ?? contextConfig
  const { currentTheme, changeTheme } = useTheme(scopeAwareConfig?.theme)
  const configUpdate = useConfigUpdate(scopeAwareConfig, loadConfig, currentProject?.worktree)
  const [mcpStatus, setMcpStatus] = useState<McpStatusResponse>({})
  const [activeTab, setActiveTab] = useState<'config' | 'theme' | 'mcp'>('config')
  
  // State for tracking unsaved changes
  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, any>>({})
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const pendingMcpChanges = unsavedChanges.mcp as OpencodeConfig['mcp'] | undefined
  const mergedMcpConfig = pendingMcpChanges || scopeConfig?.mcp
    ? { ...(scopeConfig?.mcp ?? {}), ...(pendingMcpChanges ?? {}) }
    : undefined
  const configJson = useMemo(() => {
    if (!scopeConfig) return null
    try {
      return JSON.stringify(scopeConfig, null, 2)
    } catch (error) {
      console.error('Failed to serialize config:', error)
      return null
    }
  }, [scopeConfig])
  const scopeUnavailable = configScope === 'project' && !currentProject
  const projectTargetPath = currentProject?.worktree
    ? configTargets.project[currentProject.worktree] ?? `${currentProject.worktree}/opencode.jsonc`
    : 'Select a project to enable project-scoped configuration'

  const globalTargetPath = configTargets.global ?? '~/.config/opencode/opencode.jsonc'

  const scopeTargetPath = configScope === 'global' ? globalTargetPath : projectTargetPath

  useEffect(() => {
    if (!currentProject && configScope === 'project') {
      setConfigScope('global')
    }
  }, [currentProject, configScope])

  useEffect(() => {
    if (isOpen && !hasInitializedScopeRef.current) {
      hasInitializedScopeRef.current = true
      setConfigScope('global')
    }

    if (!isOpen && hasInitializedScopeRef.current) {
      hasInitializedScopeRef.current = false
    }
  }, [isOpen])

  // Reset unsaved changes when scope changes
  useEffect(() => {
    setUnsavedChanges({})
    setHasUnsavedChanges(false)
  }, [configScope])

  useEffect(() => {
    if (!isOpen) return
    void loadConfig({ force: true })
  }, [isOpen, loadConfig])

  // Load MCP status when modal opens
  useEffect(() => {
    if (!isOpen) return

    let isMounted = true

    const loadMcpStatus = async () => {
      try {
        const mcpResponse = await openCodeService.getMcpStatus()
        if (mcpResponse.data && isMounted) {
          setMcpStatus(mcpResponse.data)
        }
      } catch (error) {
        console.error('Failed to load MCP status:', error)
      }
    }

    loadMcpStatus()

    return () => {
      isMounted = false
    }
  }, [isOpen])

  const handleThemeChange = (newTheme: string) => {
    // Change theme immediately for better UX
    changeTheme(newTheme, true)
    // Track the change for saving
    setUnsavedChanges(prev => ({ ...prev, theme: newTheme }))
    setHasUnsavedChanges(true)
  }

  const handleMcpToggle = (serverName: string, enabled: boolean) => {
    const baseMcpConfig = mergedMcpConfig ?? scopeConfig?.mcp
    const serverConfig = baseMcpConfig?.[serverName]
    if (!serverConfig) return

    const updatedMcp = {
      ...baseMcpConfig,
      [serverName]: { ...serverConfig, enabled }
    }
    
    // Track the change for saving
    setUnsavedChanges(prev => ({ ...prev, mcp: updatedMcp }))
    setHasUnsavedChanges(true)
  }

  const handleSave = async () => {
    if (!hasUnsavedChanges) return
    if (scopeUnavailable) {
      await showToast('Select a project before saving project-scoped settings.', 'warning')
      return
    }

    setIsSaving(true)
    try {
      const saveResults: ConfigUpdateResponse[] = []
      // Save all unsaved changes
      for (const [field, value] of Object.entries(unsavedChanges)) {
        const configField = field as keyof OpencodeConfig
        const result = await configUpdate.updateConfigField(configField, value, { scope: configScope })
        saveResults.push(result)
        if (result.filepath) {
          registerConfigTarget(result.scope ?? configScope, result.filepath, currentProject?.worktree)
        }
      }
      
      // Clear unsaved changes
      setUnsavedChanges({})
      setHasUnsavedChanges(false)
      
      // Force config reload
      await loadConfig({ force: true })
      if (saveResults.length > 0) {
        const latest = saveResults[saveResults.length - 1]
        if (process.env.NODE_ENV !== 'production') {
          saveResults.forEach((result) => {
            console.info('[config] Saved config update', {
              scope: result.scope ?? configScope,
              filepath: result.filepath,
              diff: result.diff,
            })
          })
        }
        await showToast(
          `Saved ${configScope} config → ${latest.filepath}`,
          'success',
        )
      }
      
      // Refresh MCP status if MCP was changed
      if (unsavedChanges.mcp) {
        const mcpResponse = await openCodeService.getMcpStatus()
        if (mcpResponse.data) {
          setMcpStatus(mcpResponse.data)
        }
      }
    } catch (error) {
      console.error('Failed to save config:', error)
      const { message, path } = extractConfigErrorMessage(error)
      const composedMessage = path ? `${message} (${path})` : message
      await showToast(composedMessage, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <Dialog
      onClose={onClose}
      style={{
        '--dialog-max-width': '900px',
        '--dialog-max-height': '85vh',
      } as CSSProperties}
    >
      <View
        box="round"
        className="p-6 bg-theme-background-alt min-w-[600px] max-w-[800px] w-full h-full max-h-[85vh] flex flex-col overflow-hidden"
      >
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-bold">Config</h2>
            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <span className="text-xs text-theme-primary">Unsaved changes</span>
              )}
              <Button
                variant="foreground0"
                box="round"
                size="small"
                onClick={handleSave}
                disabled={!hasUnsavedChanges || isSaving || scopeUnavailable}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
          <Separator />
        </div>

        {/* Scope Selector */}
        <div className="mb-6">
          <label className="text-xs font-medium text-theme-muted block mb-2">
            Configuration Scope
          </label>
          <select
            value={configScope}
            onChange={(e) => setConfigScope(e.target.value as 'global' | 'project')}
            className="w-full px-3 py-2 text-sm border rounded-md"
            style={{
              backgroundColor: 'var(--theme-background)',
              color: 'var(--theme-foreground)',
              borderColor: 'var(--theme-border)',
            }}
          >
            <option value="global">Global (~/.config/opencode/opencode.jsonc)</option>
            <option
              value="project"
              disabled={scopeUnavailable}
            >
              {currentProject
                ? `Project (${currentProject.worktree}/opencode.jsonc)`
                : 'Project (select a project to enable)'}
            </option>
          </select>
          <p className="text-xs text-theme-muted mt-2">Target: {scopeTargetPath}</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={activeTab === 'config' ? 'foreground0' : 'background1'}
            box="round"
            size="small"
            onClick={() => setActiveTab('config')}
          >
            Config
          </Button>
          <Button
            variant={activeTab === 'theme' ? 'foreground0' : 'background1'}
            box="round"
            size="small"
            onClick={() => setActiveTab('theme')}
          >
            Themes
          </Button>
          <Button
            variant={activeTab === 'mcp' ? 'foreground0' : 'background1'}
            box="round"
            size="small"
            onClick={() => setActiveTab('mcp')}
          >
            MCP Servers
          </Button>
        </div>

        <Separator className="mb-4" />

        {/* Content */}
        <div className="flex-1 min-h-[300px] overflow-y-auto scrollbar pr-1">
          {activeTab === 'config' && (
            <div>
              {scopeUnavailable ? (
                <div className="text-center py-8 text-theme-muted">
                  No project selected. Please select a project to view project-specific configuration.
                </div>
              ) : (
                <Pre className="text-xs bg-theme-background-alt p-4 rounded">
                  {contextConfigLoading ? 'Loading...' : configJson || 'No configuration available for this scope'}
                </Pre>
              )}
            </div>
          )}

          {activeTab === 'theme' && (
            scopeUnavailable ? (
              <div className="text-center py-8 text-theme-muted">
                Select a project to manage project-scoped themes.
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(themes).map(([id, theme]) => {
                  const isSelected = currentTheme === id
                  return (
                    <div
                      key={id}
                      className={`p-3 rounded cursor-pointer transition-colors border ${
                        isSelected
                          ? 'border-theme-primary ring-2 ring-theme-primary/50'
                          : 'border-theme-border hover:bg-opacity-50'
                      }`}
                      style={{
                        backgroundColor: isSelected
                          ? 'var(--theme-primary-alpha-20)'
                          : 'var(--theme-background-alt)',
                      }}
                      onClick={() => handleThemeChange(id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{theme.name}</div>
                          <div className="text-xs opacity-70 mt-1">{id}</div>
                        </div>
                        <div className="flex gap-1">
                          {Object.entries(theme.colors)
                            .slice(0, 5)
                            .map(([key, color]) => (
                              <div
                                key={key}
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: color }}
                                title={key}
                              />
                            ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}

          {activeTab === 'mcp' && (
            scopeUnavailable ? (
              <div className="text-center py-8 text-theme-muted">
                Select a project to manage project-scoped MCP servers.
              </div>
            ) : (
              <div className="space-y-3">
                {mergedMcpConfig && Object.entries(mergedMcpConfig).length > 0 ? (
                  Object.entries(mergedMcpConfig).map(([serverName, serverConfig]) => {
                    const status = mcpStatus[serverName] || 'unknown'
                    const isEnabled = serverConfig.enabled ?? true
                    
                    return (
                      <div
                        key={serverName}
                        className="p-4 rounded border"
                        style={{
                          backgroundColor: 'var(--theme-background-alt)',
                          borderColor: 'var(--theme-border)',
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{serverName}</h4>
                          <div className="flex items-center gap-3">
                            <span
                              className={`text-xs px-2 py-1 rounded`}
                              style={{
                                backgroundColor:
                                  status === 'connected'
                                    ? 'rgba(34, 197, 94, 0.2)'
                                    : 'rgba(239, 68, 68, 0.2)',
                                color:
                                  status === 'connected'
                                    ? 'rgb(34, 197, 94)'
                                    : 'rgb(239, 68, 68)',
                              }}
                            >
                              {status}
                            </span>
                            <Checkbox
                              checked={isEnabled}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleMcpToggle(serverName, e.target.checked)}
                            />
                          </div>
                        </div>
                        
                        <div className="text-sm opacity-70 space-y-1">
                          <div>Type: {serverConfig.type}</div>
                          {serverConfig.command && (
                            <div className="font-mono text-xs">
                              {serverConfig.command.join(' ')}
                            </div>
                          )}
                          {serverConfig.url && (
                            <div className="font-mono text-xs">{serverConfig.url}</div>
                          )}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-8 text-theme-muted">
                    No MCP servers configured
                  </div>
                )}
              </div>
            )
          )}
        </div>

        <Separator className="my-4" />

        {/* Footer */}
        <div className="flex justify-end">
          <Button
            variant="background2"
            box="round"
            onClick={onClose}
            size="small"
          >
            Close
          </Button>
        </div>
      </View>
    </Dialog>
  )
}
