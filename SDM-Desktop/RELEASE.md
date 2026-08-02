# Desktop release

Electron-оболочка вокруг SDM Web. Каждая сборка сначала гонит `expo export -p web`
из `../SDM-Web`, копирует результат в `./app` и прогоняет `prepare-assets.js`
(без него иконочные шрифты выпадают из пакета — см. комментарий в самом скрипте).

## Windows

```sh
npm run dist:win
```

Отдаёт `release/SDM-Setup-win-x64.exe` + `latest.yml`.

## macOS

```sh
npm run dist:mac              # подписанная и нотаризованная сборка
npm run dist:mac:unsigned     # локальная проверка, без сертификата
```

Отдаёт `SDM-mac-arm64.dmg`, `SDM-mac-x64.dmg`, одноимённые `.zip` и `latest-mac.yml`.

`.zip` обязательны: обновление на macOS ставит Squirrel.Mac, а он умеет только zip —
`latest-mac.yml` ссылается именно на них. DMG нужен людям для первой установки.

### Что требуется для подписи

1. Сертификат **Developer ID Application** (team `VL4B4R8D84`) в связке ключей.
   `Apple Development` не подходит — он только для локальной отладки.
   Xcode → Settings → Accounts → Manage Certificates → «+» → Developer ID Application.
2. **App-specific password** — это *не* пароль от Apple ID. Выпускается на
   appleid.apple.com → Sign-In and Security → App-Specific Passwords и всегда
   выглядит как четыре группы по четыре строчные буквы через дефис. Обычный
   пароль даёт `HTTP status code: 401. Invalid credentials` уже после успешной
   подписи, на шаге notarytool.

3. Учётка для нотаризации. Предпочтительно — один раз положить её в связку
   ключей, тогда пароль больше нигде не всплывает:

   ```sh
   xcrun notarytool store-credentials "SDM" \
     --apple-id kukalab@icloud.com --team-id VL4B4R8D84 --password <app-specific>
   ```

   дальше сборка идёт как `APPLE_KEYCHAIN_PROFILE=SDM npm run dist:mac`.

   Вариант через окружение (все три обязательны, `APPLE_TEAM_ID` именно в
   окружении — electron-builder игнорирует `notarize.teamId` в конфиге):

   ```sh
   export APPLE_ID="kukalab@icloud.com"
   export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
   export APPLE_TEAM_ID="VL4B4R8D84"
   ```

Без сертификата приложение остаётся ad-hoc-подписанным: скачанный DMG получает
quarantine-флаг, и macOS отказывается открывать приложение («повреждено»), а
автообновление не работает вовсе.

Проверить готовый билд:

```sh
codesign -dv --verbose=4 "release/mac-arm64/Seafarer Documents Manager.app"
spctl -a -vvv -t install "release/mac-arm64/Seafarer Documents Manager.app"   # → accepted, source=Notarized Developer ID
```

## Публикация

Имена артефактов зашиты в `latest.yml` / `latest-mac.yml` — переименование ломает
автообновление у тех, кто уже сидит на предыдущей версии. `latest*.yml` нужно
класть в релиз **каждый раз**, иначе апдейтер не увидит новую версию.

```sh
gh release upload v<version> \
  release/SDM-mac-arm64.dmg release/SDM-mac-x64.dmg \
  release/SDM-mac-arm64.zip release/SDM-mac-x64.zip \
  release/latest-mac.yml --repo maestroowner-pixel/SDM --clobber
```
