# /saves — Local Save Slots

The game writes to `localStorage` under the key `play3d.hood-monopoly.v1`.
This folder is reserved for future export/import features (file-based save slots)
and Game Vault sync hooks.

Current behaviour:
- Auto-save fires on every state change.
- `Continue Save` button appears on the main menu when a save exists.
- `Vault Menu` and `Run It Back` clear the save and return to menu.

To export your current save manually:
```js
copy(localStorage.getItem('play3d.hood-monopoly.v1'));
```

To import:
```js
localStorage.setItem('play3d.hood-monopoly.v1', <pasted-json-string>);
```
