import React, { useState, useEffect, KeyboardEvent } from "react";
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
  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);
    if (activeIndex !== -1) {
      setFocusedIndex(activeIndex);
    }
  }, [activeTab, tabs]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const enabledTabs = tabs.filter((tab) => !tab.disabled);
    const currentEnabledIndex = enabledTabs.findIndex((tab) => tab.id === activeTab);
    
    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        if (currentEnabledIndex > 0) {
          const newTab = enabledTabs[currentEnabledIndex - 1];
          onTabChange(newTab.id);
        }
        break;
      case "ArrowRight":
        e.preventDefault();
        if (currentEnabledIndex < enabledTabs.length - 1) {
          const newTab = enabledTabs[currentEnabledIndex + 1];
          onTabChange(newTab.id);
        }
        break;
      case "Home":
        e.preventDefault();
        if (enabledTabs.length > 0) {
          onTabChange(enabledTabs[0].id);
        }
        break;
      case "End":
        e.preventDefault();
        if (enabledTabs.length > 0) {
          onTabChange(enabledTabs[enabledTabs.length - 1].id);
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
      {tabs.map((tab, index) => (
        <Button
          key={tab.id}
          id={`sidebar-tab-${tab.id}`}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`sidebar-panel-${tab.id}`}
          tabIndex={activeTab === tab.id ? 0 : -1}
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