import {useLayoutEffect,useState} from 'react';
const themes=['light','dark','paper'] as const;
type Theme=typeof themes[number];
export function ThemePicker(){
  const [theme,setTheme]=useState<Theme>(()=>{try{const saved=localStorage.getItem('quebec-dashboard-theme');return themes.includes(saved as Theme)?saved as Theme:'light';}catch{return 'light';}});
  useLayoutEffect(()=>{document.documentElement.dataset.theme=theme;try{localStorage.setItem('quebec-dashboard-theme',theme);}catch{/* Theme still works when storage is unavailable. */}},[theme]);
  return <label className="theme-picker">Background <select aria-label="Dashboard background" value={theme} onChange={event=>setTheme(event.target.value as Theme)}><option value="light">Light</option><option value="dark">Dark</option><option value="paper">Warm paper</option></select></label>;
}
