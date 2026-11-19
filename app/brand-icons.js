const paths={
 home:'<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>',
 body:'<path d="M4 7h16M4 12h16M4 17h16"/><circle cx="8" cy="7" r="2" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="11" cy="17" r="2" fill="currentColor" stroke="none"/>',
 food:'<circle cx="12" cy="12" r="8"/><path d="M12 4v8l6 5"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>',
 workout:'<path d="M4 19h4v-6H4zM10 19h4V9h-4zM16 19h4V5h-4z"/><path d="M5 8l5-3 5 2 4-4"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 14h3M8 17h3"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
 add:'<path d="M12 4v16M4 12h16"/>'
};
export function brandIcon(name,className=''){
 const path=paths[name]||paths.home;
 return `<svg class="mwl-icon ${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}
