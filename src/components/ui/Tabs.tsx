import React, { useState } from "react";

export interface TabItem {
  key: string;
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  defaultActiveKey?: string;
  onChange?: (key: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  defaultActiveKey,
  onChange,
  className = "",
}) => {
  const [activeKey, setActiveKey] = useState<string>(
    defaultActiveKey ?? tabs[0]?.key ?? ""
  );

  const handleSelect = (key: string) => {
    setActiveKey(key);
    onChange?.(key);
  };

  if (tabs.length === 0) return null;

  const active = tabs.find((t) => t.key === activeKey) ?? tabs[0];

  return (
    <div className={className}>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.key === active.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleSelect(tab.key)}
              className={`px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px focus:outline-none ${
                isActive
                  ? "border-accent text-accent"
                  : "border-transparent text-text-secondary hover:text-text hover:bg-bg-subtle"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active content */}
      <div className="pt-6">{active.content}</div>
    </div>
  );
};
