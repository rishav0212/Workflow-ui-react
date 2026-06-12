import React, { useState, useEffect } from 'react';

interface IconOption {
    label: string;
    value: string;
}

interface IconPickerGridProps {
    value: string;
    onChange: (icon: string) => void;
}

export default function IconPickerGrid({ value, onChange }: IconPickerGridProps) {
    const [search, setSearch] = useState('');
    const [allIcons, setAllIcons] = useState<IconOption[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchIcons = async () => {
            const cached = localStorage.getItem("cached_fa_icons");
            if (cached) {
                setAllIcons(JSON.parse(cached));
                return;
            }

            setLoading(true);
            try {
                // Use jsDelivr for reliable JSON delivery of the full FontAwesome set
                const res = await fetch(
                    "https://cdn.jsdelivr.net/gh/FortAwesome/Font-Awesome@6.5.1/metadata/icons.json"
                );
                if (!res.ok) throw new Error("Failed to load");
                const data = await res.json();

                const iconsList = Object.keys(data).map((key) => {
                    const icon = data[key];
                    const prefix = icon.styles?.includes("solid")
                        ? "fas"
                        : icon.styles?.includes("brands")
                        ? "fab"
                        : "far";
                    return {
                        label: icon.label,
                        value: `${prefix} fa-${key}`,
                    };
                });

                setAllIcons(iconsList);
                localStorage.setItem("cached_fa_icons", JSON.stringify(iconsList));
            } catch (e) {
                console.error("Icon fetch error:", e);
                // Fallback to a small list if offline
                setAllIcons([
                    { label: "Window Maximize", value: "fas fa-window-maximize" },
                    { label: "Chart", value: "fas fa-chart-line" },
                    { label: "Cog", value: "fas fa-cog" },
                    { label: "Users", value: "fas fa-users" }
                ]);
            } finally {
                setLoading(false);
            }
        };

        fetchIcons();
    }, []);

    const filteredIcons = allIcons.filter(icon => 
        icon.label.toLowerCase().includes(search.toLowerCase()) || 
        icon.value.toLowerCase().includes(search.toLowerCase())
    );

    // Limit to 100 to keep the grid fast
    const displayIcons = filteredIcons.slice(0, 100);

    // Ensure current value is always rendered if it exists but isn't in the top 100
    if (value && !displayIcons.find(i => i.value === value)) {
        const selectedObj = allIcons.find(i => i.value === value) || { label: "Custom", value };
        displayIcons.unshift(selectedObj);
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="relative">
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400"></i>
                <input
                    type="text"
                    placeholder="Search thousands of icons (e.g. chart, user)..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-canvas-subtle border border-canvas-subtle rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                />
            </div>
            
            <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                {loading && (
                    <div className="col-span-6 py-8 text-center text-xs text-neutral-500">
                        <i className="fas fa-circle-notch fa-spin mr-2"></i> Loading icon library...
                    </div>
                )}
                
                {!loading && displayIcons.length === 0 && (
                    <div className="col-span-6 py-8 text-center text-xs text-neutral-500">
                        No icons found matching "{search}"
                    </div>
                )}

                {!loading && displayIcons.map(iconObj => (
                    <button
                        key={iconObj.value}
                        type="button"
                        onClick={() => onChange(iconObj.value)}
                        className={`aspect-square rounded-xl flex flex-col items-center justify-center text-lg transition-all ${
                            value === iconObj.value
                                ? 'bg-brand-500 text-white shadow-brand-sm scale-110 z-10'
                                : 'bg-canvas-subtle text-neutral-500 hover:bg-neutral-200 hover:text-ink-primary'
                        }`}
                        title={iconObj.label}
                    >
                        <i className={iconObj.value}></i>
                    </button>
                ))}
            </div>
            
            <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-2 flex-1 mr-4">
                    <span className="text-xs text-neutral-500 whitespace-nowrap">Custom class:</span>
                    <input 
                        type="text" 
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="fas fa-something"
                        className="w-full px-2 py-1 bg-canvas-subtle border border-canvas-subtle rounded text-xs font-mono"
                    />
                </div>
                {!loading && (
                    <span className="text-[10px] text-neutral-400 whitespace-nowrap">
                        {displayIcons.length} of {filteredIcons.length}
                    </span>
                )}
            </div>
        </div>
    );
}
