import React, { KeyboardEvent } from "react";
import { Button } from "./button";

export interface SidebarTab {
  id: string;
  label: string;
  disabled?: boolean;
}

interface SidebarTabsProps {
  tabs: SidebarTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export const SidebarTabs: React.FC<SidebarTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = "",
}) => {
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const enabledTabs = tabs.filter((tab) => !tab.disabled);
    const currentEnabledIndex = enabledTabs.findIndex((tab) => tab.id === activeTab);
    
    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        if (currentEnabledIndex > 0) {
          const newTab = enabledTabs[currentEnabledIndex - 1];
          onTabChange(newTab.id);
          // Move focus to the newly active tab button
          setTimeout(() => {
            document.getElementById(`sidebar-tab-${newTab.id}`)?.focus();
          }, 0);
        }
        break;
      case "ArrowRight":
        e.preventDefault();
        if (currentEnabledIndex < enabledTabs.length - 1) {
          const newTab = enabledTabs[currentEnabledIndex + 1];
          onTabChange(newTab.id);
          setTimeout(() => {
            document.getElementById(`sidebar-tab-${newTab.id}`)?.focus();
          }, 0);
        }
        break;
      case "Home":
        e.preventDefault();
        if (enabledTabs.length > 0) {
          const newId = enabledTabs[0].id;
          onTabChange(newId);
          setTimeout(() => {
            document.getElementById(`sidebar-tab-${newId}`)?.focus();
          }, 0);
        }
        break;
      case "End":
        e.preventDefault();
        if (enabledTabs.length > 0) {
          const newId = enabledTabs[enabledTabs.length - 1].id;
          onTabChange(newId);
          setTimeout(() => {
            document.getElementById(`sidebar-tab-${newId}`)?.focus();
          }, 0);
        }
        break;
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Sidebar tabs"
      className={`flex gap-1 ${className}`}
      onKeyDown={handleKeyDown}
    >
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          id={`sidebar-tab-${tab.id}`}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`sidebar-panel-${tab.id}`}
          tabIndex={activeTab === tab.id && !tab.disabled ? 0 : -1}
          onClick={() => onTabChange(tab.id)}
          variant={activeTab === tab.id ? "foreground0" : undefined}
          box="square"
          size="small"
          className="capitalize whitespace-nowrap"
          disabled={tab.disabled}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  );
};
