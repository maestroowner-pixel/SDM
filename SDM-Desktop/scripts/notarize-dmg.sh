#!/bin/bash
# Подписывает, нотаризует и staple-ит DMG-образы.
#
# electron-builder нотаризует .app ДО того, как упакует его в dmg, а сам образ
# оставляет неподписанным. Пока файл локальный, разницы нет — Gatekeeper смотрит
# на приложение внутри. Но у скачанного файла появляется quarantine-флаг, и тогда
# проверяется сначала образ: тикета на нём нет, и macOS отказывается открывать его
# со словами «Apple не может проверить на наличие вредоносного ПО».
#
# Запускать после `npm run dist:mac`, из папки SDM-Desktop:
#   APPLE_KEYCHAIN_PROFILE=SDM ./scripts/notarize-dmg.sh release/*.dmg
set -euo pipefail

IDENTITY="${CSC_NAME:-Developer ID Application}"
PROFILE="${APPLE_KEYCHAIN_PROFILE:-}"

if [ $# -eq 0 ]; then
  echo "использование: $0 <файл.dmg> [ещё.dmg …]" >&2
  exit 1
fi

# notarytool умеет брать учётку либо из связки ключей, либо из окружения.
if [ -n "$PROFILE" ]; then
  CREDS=(--keychain-profile "$PROFILE")
elif [ -n "${APPLE_ID:-}" ] && [ -n "${APPLE_APP_SPECIFIC_PASSWORD:-}" ] && [ -n "${APPLE_TEAM_ID:-}" ]; then
  CREDS=(--apple-id "$APPLE_ID" --password "$APPLE_APP_SPECIFIC_PASSWORD" --team-id "$APPLE_TEAM_ID")
else
  echo "нет учётки для notarytool: задай APPLE_KEYCHAIN_PROFILE либо APPLE_ID + APPLE_APP_SPECIFIC_PASSWORD + APPLE_TEAM_ID" >&2
  exit 1
fi

for dmg in "$@"; do
  echo "── $(basename "$dmg")"

  codesign --force --sign "$IDENTITY" --timestamp "$dmg"
  xcrun notarytool submit "$dmg" "${CREDS[@]}" --wait
  xcrun stapler staple "$dmg"

  # Итоговая проверка ровно тем путём, которым пойдёт Finder у скачавшего.
  spctl -a -vvv -t open --context context:primary-signature "$dmg"
done

echo "готово: образы подписаны, нотаризованы и с тикетом"
