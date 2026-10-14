const $ = (s, root = document) => root.querySelector(s);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = (v, d = 0) => Number.isFinite(v) ? v.toLocaleString('en-IN', {maximumFractionDigits:d,minimumFractionDigits:d}) : '—';
const initials = name => String(name || '?').split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
const iso = () => new Date().toISOString();
const shortDate = v => v ? new Date(v).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'}) : '—';
const icons = {
 leaf:'<path d="M19 4C9 2 3 7 6 14s12 2 13-10Z"/><path d="M4 21C7 13 11 10 16 7"/><path d="m9 13 5 1"/>',
 grid:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
 people:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
 plan:'<rect x="5" y="4" width="15" height="17" rx="2"/><path d="M9 2v4m7-4v4M9 11h7m-7 4h5M2 9v10"/>',
 book:'<path d="M12 6C7 2 3 4 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-1 0-5-2-10 2v15"/>',
 settings:'<path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="3" fill="currentColor" stroke="none"/><circle cx="16" cy="17" r="3" fill="currentColor" stroke="none"/>',
 shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 right:'<path d="m9 5 7 7-7 7"/>',
 arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
 down:'<path d="m6 9 6 6 6-6"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 scale:'<rect x="3" y="4" width="18" height="17" rx="4"/><path d="M7 10a5 5 0 0 1 10 0H7Zm5 0 2-3"/>',
 fire:'<path d="M12 2c1 6 6 7 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 3 2 3 2 3s3-4 1-9Z"/>',
 protein:'<path d="M18 4a5 5 0 0 0-7 1L5 11a5 5 0 0 0 7 7l6-6a6 6 0 0 0 0-8ZM9 7l8 8"/>',
 user:'<circle cx="12" cy="7" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
 chair:'<path d="M6 3v12h12V8M6 11h12M7 15v6m10-6v6"/>',
 walk:'<circle cx="14" cy="4" r="2"/><path d="m7 21 4-7m6 7-4-8 1-5m-8 4 4-4h4l4 4h3M11 8l-1 6"/>',
 run:'<circle cx="16" cy="4" r="2"/><path d="m3 17 5 1 4-5m-3-2 4-4 4 4h4M13 7l-1 6 5 2v6"/>',
 labs:'<path d="M9 3h6m-5 0v7L4 19a1.3 1.3 0 0 0 1 2h14a1.3 1.3 0 0 0 1-2l-6-9V3M7 16h10"/>',
 bulb:'<path d="M9 18h6m-6 3h6m-6-6c-5-4-2-12 3-12s8 8 3 12v3H9v-3Z"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
 upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 17v4h16v-4"/>',
 print:'<path d="M6 9V3h12v6M6 17H3V9h18v8h-3"/><path d="M6 14h12v7H6zM17 11h1"/>',
 search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
 trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
 external:'<path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7"/>',
 wheat:'<path d="M12 22V5m0 6C6 12 4 8 5 5c4 0 7 2 7 6Zm0 6C6 18 4 14 5 11c4 0 7 2 7 6Zm0-6c6 1 8-3 7-6-4 0-7 2-7 6Zm0 6c6 1 8-3 7-6-4 0-7 2-7 6Zm0-12V1"/>',
 cup:'<path d="M4 8h12v9a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Zm12 1h2a3 3 0 0 1 0 6h-2M7 2v3m6-3v3"/>',
 fruit:'<path d="M12 7C4 2-1 12 6 20c3 2 4-1 6 0 2-1 3 2 6 0 7-8 2-18-6-13Zm0 0c0-4 2-5 5-5"/>',
 droplet:'<path d="M12 2C8 8 4 11 4 15a8 8 0 0 0 16 0c0-4-4-7-8-13Z"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
 edit:'<path d="m14 5 5 5M4 20l5-1L20 8a3 3 0 0 0-4-4L5 15l-1 5Z"/>',
 cloud:'<path d="M6 18a5 5 0 0 1-1-10 7 7 0 0 1 13-1 5 5 0 0 1 0 11M9 15l3 3 5-5"/>'
};
const icon = (name, cls='') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.leaf}</svg>`;

function plateArt(){return `<div class="plate-art" role="img" aria-label="Illustration of a balanced plate with vegetables, grains and pulses"><svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="plate"><stop offset="80%" stop-color="#fffef5"/><stop offset="95%" stop-color="#f2f0df"/><stop offset="100%" stop-color="#fffff9"/></radialGradient></defs><circle cx="120" cy="120" r="112" fill="url(#plate)" stroke="#e5e7d9"/><circle cx="120" cy="120" r="95" fill="#f5f3e9" stroke="#e2e2d1"/><path d="M120 28a92 92 0 0 0 0 184Z" fill="#dce6bf"/><path d="M123 28a92 92 0 0 1 89 90h-89Z" fill="#ede1bf"/><path d="M123 122h89a92 92 0 0 1-89 90Z" fill="#e4cfb9"/><g fill="#719452" stroke="#5c7e42" stroke-width="1.3"><path d="M64 85c-28-20-12-39 4-32 3-23 26-17 24 0 23-6 31 14 10 24 7 23-15 30-23 12-4 19-25 13-15-4Z"/><path d="M58 129c-30-17-17-41 0-35 0-21 22-23 25-3 22-12 32 8 16 21 12 20-10 33-20 18-9 21-28 17-21-1Z"/><path d="M88 166c-28 10-36-14-19-23-17-12-4-31 10-20 10-22 30-14 25 5 21 7 20 28-3 29 9 22-16 31-13 9Z"/></g><g fill="none" stroke="#b2c488" stroke-width="1.5"><path d="m72 52 9 39m-24 15 24 24m19 4-21 28"/></g><g fill="#e79a5d" stroke="#ce844a"><path d="m44 151 11-11 32 42-7 7Z"/><path d="m49 174 6-10 42 22-5 12Z"/></g><g fill="#e7d6aa" stroke="#c6b885" stroke-width="1"><ellipse cx="150" cy="63" rx="3" ry="8" transform="rotate(35 150 63)"/><ellipse cx="164" cy="77" rx="3" ry="8" transform="rotate(-30 164 77)"/><ellipse cx="139" cy="84" rx="3" ry="8" transform="rotate(60 139 84)"/><ellipse cx="181" cy="91" rx="3" ry="8" transform="rotate(25 181 91)"/><ellipse cx="151" cy="102" rx="3" ry="8" transform="rotate(-40 151 102)"/><ellipse cx="171" cy="104" rx="3" ry="8" transform="rotate(60 171 104)"/><ellipse cx="137" cy="59" rx="3" ry="8" transform="rotate(-15 137 59)"/><ellipse cx="157" cy="88" rx="3" ry="8" transform="rotate(60 157 88)"/><ellipse cx="182" cy="111" rx="3" ry="8" transform="rotate(-15 182 111)"/><ellipse cx="136" cy="105" rx="3" ry="8" transform="rotate(20 136 105)"/></g><g fill="#a47856" stroke="#90613c"><ellipse cx="146" cy="143" rx="10" ry="6" transform="rotate(30 146 143)"/><ellipse cx="175" cy="145" rx="10" ry="6" transform="rotate(-20 175 145)"/><ellipse cx="163" cy="166" rx="10" ry="6" transform="rotate(20 163 166)"/><ellipse cx="139" cy="168" rx="10" ry="6" transform="rotate(-40 139 168)"/><ellipse cx="146" cy="188" rx="10" ry="6" transform="rotate(20 146 188)"/><ellipse cx="184" cy="163" rx="8" ry="5" transform="rotate(-40 184 163)"/></g><g fill="#c86147" stroke="#a7533b"><circle cx="104" cy="62" r="12"/><circle cx="53" cy="78" r="11"/></g><g stroke="#91a34b" stroke-width="2"><path d="m99 57 10 10m0-10-10 10m-51 11 10 0m-5-5v10"/></g><circle cx="120" cy="120" r="96" fill="none" stroke="#fffef5" stroke-width="5"/><path d="M120 25v190m0-95h95" stroke="#fffef5" stroke-width="5"/></svg></div>`;}

export { $, esc, num, initials, iso, shortDate, icon, plateArt };
