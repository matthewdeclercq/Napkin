Napkin - MVP

Setup

1) Requirements: Node 18+, Watchman (macOS). Optional: Xcode/Android Studio for simulators.
2) Install deps:

```
cd /Users/matthewdeclercq/DEV/Napkin
npm i
```

Run

```
npm run start
# Press i for iOS simulator or a for Android if configured, or scan QR in Expo Go
```

Notes

- Local persistence with @react-native-async-storage/async-storage.
- Formulas via mathjs using A1 refs relative to the center cell.
- Grid limited to 25x25; adds missing adjacent cells on first submit of a new entry.
- **Long press** on napkin list items to access a menu with delete/rename options.


