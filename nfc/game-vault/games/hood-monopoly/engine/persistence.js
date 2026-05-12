/* PLAY 3D · Hood Monopoly — localStorage persistence */
window.HM = window.HM || {};
HM.STORAGE_KEY = 'play3d.hood-monopoly.v1';
HM.saveGame = (state) => { try { localStorage.setItem(HM.STORAGE_KEY, JSON.stringify({ ...state, savedAt:Date.now() })); return true; } catch { return false; } };
HM.loadGame = () => { try { const raw = localStorage.getItem(HM.STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } };
HM.clearGame = () => { try { localStorage.removeItem(HM.STORAGE_KEY); } catch {} };
HM.hasSave = () => !!localStorage.getItem(HM.STORAGE_KEY);
