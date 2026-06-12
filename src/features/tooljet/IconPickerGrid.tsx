import React, { useState } from 'react';

const COMMON_ICONS = [
    "fas fa-window-maximize",
    "fas fa-rocket",
    "fas fa-cube",
    "fas fa-chart-bar",
    "fas fa-chart-line",
    "fas fa-chart-pie",
    "fas fa-address-book",
    "fas fa-boxes",
    "fas fa-file-invoice-dollar",
    "fas fa-users",
    "fas fa-cog",
    "fas fa-file-alt",
    "fas fa-tachometer-alt",
    "fas fa-project-diagram",
    "fas fa-database",
    "fas fa-server",
    "fas fa-cloud",
    "fas fa-envelope",
    "fas fa-calendar-alt",
    "fas fa-shopping-cart",
    "fas fa-briefcase",
    "fas fa-camera",
    "fas fa-globe",
    "fas fa-laptop",
    "fas fa-mobile-alt",
    "fas fa-shield-alt",
    "fas fa-star",
    "fas fa-heart",
    "fas fa-check-circle",
    "fas fa-exclamation-circle"
];

interface IconPickerGridProps {
    value: string;
    onChange: (icon: string) => void;
}

export default function IconPickerGrid({ value, onChange }: IconPickerGridProps) {
    const [search, setSearch] = useState('');

    const filteredIcons = COMMON_ICONS.filter(icon => 
        icon.toLowerCase().includes(search.toLowerCase())
    );

    // Ensure current value is always in the list, even if it's a custom one not in our presets
    const iconsToRender = value && !COMMON_ICONS.includes(value) && value.includes(search)
        ? [value, ...filteredIcons]
        : filteredIcons;

    return (
        <div className="flex flex-col gap-3">
            <div className="relative">
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400"></i>
                <input
                    type="text"
                    placeholder="Search icons (e.g. chart, user)..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-canvas-subtle border border-canvas-subtle rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                />
            </div>
            
            <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                {iconsToRender.map(iconClass => (
                    <button
                        key={iconClass}
                        type="button"
                        onClick={() => onChange(iconClass)}
                        className={`aspect-square rounded-xl flex items-center justify-center text-lg transition-all ${
                            value === iconClass
                                ? 'bg-brand-500 text-white shadow-brand-sm scale-110 z-10'
                                : 'bg-canvas-subtle text-neutral-500 hover:bg-neutral-200 hover:text-ink-primary'
                        }`}
                        title={iconClass}
                    >
                        <i className={iconClass}></i>
                    </button>
                ))}
            </div>
            
            <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-neutral-500">Custom class:</span>
                <input 
                    type="text" 
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="fas fa-something"
                    className="flex-1 px-2 py-1 bg-canvas-subtle border border-canvas-subtle rounded text-xs font-mono"
                />
            </div>
        </div>
    );
}
