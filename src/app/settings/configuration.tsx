import { createFileRoute } from '@tanstack/react-router'
import { getMcpStatus, getConfig, getAgents, getProviders, getCommands } from '@/lib/opencode-server-fns'
import { ConfigurationPage } from './-components/ConfigurationPage'

export const Route = createFileRoute('/settings/configuration')({
  loader: async () => {
    try {
      // Fetch all necessary data for the configuration page
      const [config, agents, providers, commands, mcpStatus] = await Promise.all([
        getConfig(),
        getAgents(),
        getProviders(), 
        getCommands(),
        getMcpStatus()
      ])
      
      return {
        config,
        agents,
        providers,
        commands,
        mcpStatus
      }
    } catch (error) {
      console.error('Failed to load configuration data:', error)
      // Return empty data as fallback
      return {
        config: {},
        agents: [],
        providers: {},
        commands: [],
        mcpStatus: {}
      }
    }
  },
  component: ConfigurationPage,
})